"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export type VisaResult = { ok: boolean; message: string };
const toDate = (v: FormDataEntryValue | null) => { const s = String(v || ""); return s ? new Date(s) : null; };
const str = (v: FormDataEntryValue | null) => String(v || "").trim() || null;

// PUBLIC — no auth. A traveller fills the trip's visa form; an entry is created
// and they're sent to their generated cover letter + checklist.
export async function submitVisaApplicant(_prev: VisaResult | undefined, formData: FormData): Promise<VisaResult> {
  const tripId = String(formData.get("tripId") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  if (!tripId || !fullName) return { ok: false, message: "Please enter your full name (as in your passport)." };

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
  if (!trip) return { ok: false, message: "This visa link is invalid." };

  const a = await prisma.visaApplicant.create({
    data: {
      tripId,
      fullName,
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
      occupation: str(formData.get("occupation")),
      employer: str(formData.get("employer")),
      employerAddress: str(formData.get("employerAddress")),
      income: str(formData.get("income")),
      funding: str(formData.get("funding")) || "self",
      sponsorName: str(formData.get("sponsorName")),
      sponsorRelation: str(formData.get("sponsorRelation")),
      prevSchengen: str(formData.get("prevSchengen")),
      notes: str(formData.get("notes")),
    },
  });
  revalidatePath("/", "layout");
  redirect(`/visa/result/${a.id}`);
}
