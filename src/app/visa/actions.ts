"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ANY_SCHENGEN, DEFAULT_SCHENGEN, isAnySchengen, schengenCountry } from "@/lib/schengen";
import { visaChecklist } from "@/lib/visa";
import { OTHER_OPTION, visaTypeForDestination } from "@/lib/destinations";

export type VisaResult = { ok: boolean; message: string };
const toDate = (v: FormDataEntryValue | null) => { const s = String(v || ""); return s ? new Date(s) : null; };
const str = (v: FormDataEntryValue | null) => String(v || "").trim() || null;

// PUBLIC — no auth. Two ways in, one handler:
//
//   • a TRIP's link, where the agency has already chosen the destination and the
//     dates come from the trip; or
//   • the agency's own permanent link, where there is no trip at all and the
//     traveller names the country and the dates themselves.
//
// The second is what an agency hands to a corporate client: one URL, any number
// of people, nothing to set up first. Either way the application is stamped with
// the ORG, because that is what decides whose desk it lands on.
export async function submitVisaApplicant(_prev: VisaResult | undefined, formData: FormData): Promise<VisaResult> {
  const tripId = String(formData.get("tripId") || "") || null;
  const formOrgId = String(formData.get("orgId") || "") || null;
  const givenName = str(formData.get("givenName"));
  const surname = str(formData.get("surname"));
  // Back-compat: older links may still post a single fullName field.
  const legacyFull = String(formData.get("fullName") || "").trim() || null;
  const fullName = [givenName, surname].filter(Boolean).join(" ") || legacyFull || "";
  if (!tripId && !formOrgId) return { ok: false, message: "This visa link is invalid." };
  if (!fullName) return { ok: false, message: "Please enter your name exactly as in your passport." };

  // On the agency link the traveller picks the destination, and the destination
  // picks the template — Schengen rules for a Schengen state, the general
  // visitor-visa template for anywhere else. On a trip link the agency chose.
  const picked = str(formData.get("visaCountry"));
  const typed = str(formData.get("visaCountryOther"));
  const destination = picked === OTHER_OPTION ? typed : picked;
  const visaType = tripId
    ? (str(formData.get("visaType")) || "schengen")
    : visaTypeForDestination(destination);

  let orgId = formOrgId;
  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { orgId: true } });
    if (!trip) return { ok: false, message: "This visa link is invalid." };
    orgId = trip.orgId;
  } else {
    const org = await prisma.organization.findUnique({ where: { id: orgId! }, select: { id: true } });
    if (!org) return { ok: false, message: "This visa link is invalid." };
  }

  const data = {
      tripId,
      orgId,
      fullName,
      surname,
      givenName,
      dob: toDate(formData.get("dob")),
      placeOfBirth: str(formData.get("placeOfBirth")),
      nationality: str(formData.get("nationality")) || "Indian",
      maritalStatus: str(formData.get("maritalStatus")),
      passportNo: str(formData.get("passportNo")),
      passportIssue: toDate(formData.get("passportIssue")),
      passportExpiry: toDate(formData.get("passportExpiry")),
      passportPlace: str(formData.get("passportPlace")),
      address: str(formData.get("address")),
      city: str(formData.get("city")),
      pin: str(formData.get("pin")),
      phone: str(formData.get("phone")),
      email: str(formData.get("email")),
      employmentType: str(formData.get("employmentType")) || "employed",
      occupation: str(formData.get("occupation")),
      employer: str(formData.get("employer")),
      employerAddress: str(formData.get("employerAddress")),
      gstNo: str(formData.get("gstNo")),
      income: str(formData.get("income")),
      funding: str(formData.get("funding")) || "self",
      sponsorName: str(formData.get("sponsorName")),
      sponsorRelation: str(formData.get("sponsorRelation")),
      sponsorWork: str(formData.get("sponsorWork")),
      sponsorEmployer: str(formData.get("sponsorEmployer")),
      sponsorGst: str(formData.get("sponsorGst")),
      sponsorIncome: str(formData.get("sponsorIncome")),
      prevSchengen: str(formData.get("prevSchengen")),
      wantsLongTerm: String(formData.get("wantsLongTerm")) === "yes",
      travellingWith: str(formData.get("travellingWith")),
      travelHistory: str(formData.get("travelHistory")),
      dependents: str(formData.get("dependents")),
      investments: str(formData.get("investments")),
      notes: str(formData.get("notes")),
      visaType,
      // A Schengen file always belongs to one member state. The applicant picks
      // it on the form; if an old link posted nothing, it falls back to Malta
      // rather than being left blank for the operator to guess at.
      // "Any Schengen" is stored as itself. Resolving it to a country here would
      // be inventing a decision the traveller explicitly didn't make; the desk
      // shows it as open until the nights answer it.
      visaCountry: visaType !== "schengen"
        ? destination
        : isAnySchengen(destination)
          ? ANY_SCHENGEN
          : schengenCountry(destination || DEFAULT_SCHENGEN.name).name,
      travelFrom: toDate(formData.get("travelFrom")),
      travelTo: toDate(formData.get("travelTo")),
      residenceCountry: str(formData.get("residenceCountry")),
      travelPurpose: str(formData.get("travelPurpose")) || "tourism",
      hostInvite: str(formData.get("hostInvite")),
      mostNightsCountry: str(formData.get("mostNightsCountry")),
      entryCountry: str(formData.get("entryCountry")),
      minorParents: str(formData.get("minorParents")),
      visaRefusals: str(formData.get("visaRefusals")),
      entryIssues: str(formData.get("entryIssues")),
      criminalRecord: str(formData.get("criminalRecord")),
  };

  // What they did NOT tick. Rebuilding the list here rather than trusting a
  // posted one means the record matches the documents the desk will actually
  // ask for, even if the form were tampered with or an answer changed late.
  const ticked = new Set(formData.getAll("have").map((v) => String(v)));
  const required = visaChecklist(data, "traveller")
    .filter((g) => g.title !== "We take care of these for you")
    .flatMap((g) => g.items.map((i) => i.label));
  const missing = required.filter((l) => !ticked.has(l));

  const a = await prisma.visaApplicant.create({
    data: { ...data, missingDocs: missing.length ? missing.join(" | ") : null },
  });
  revalidatePath("/", "layout");
  redirect(`/visa/checklist/${a.id}`);
}
