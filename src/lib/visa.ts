// Generates a visa cover letter + document checklist by merging what the applicant
// filled with the trip data already in TripZei. Supports Schengen — addressed to
// whichever member state the applicant is applying to, Malta by default — and a
// GENERIC visitor-visa template for any other country (New Zealand, UK, USA, …).
// The visa type is chosen when the operator shares the link; the Schengen country
// is chosen by the applicant on the form. Both are stored on the applicant.

import { fileCountry, isAnySchengen, schengenCountry } from "./schengen";

type ApplicantLite = {
  fullName: string;
  dob?: Date | null;
  placeOfBirth?: string | null;
  nationality?: string | null;
  maritalStatus?: string | null;
  passportNo?: string | null;
  passportIssue?: Date | null;
  passportExpiry?: Date | null;
  passportPlace?: string | null;
  address?: string | null;
  city?: string | null;
  pin?: string | null;
  phone?: string | null;
  email?: string | null;
  employmentType?: string | null;
  occupation?: string | null;
  employer?: string | null;
  employerAddress?: string | null;
  gstNo?: string | null;
  income?: string | null;
  funding?: string | null;
  sponsorName?: string | null;
  sponsorRelation?: string | null;
  prevSchengen?: string | null;
  wantsLongTerm?: boolean | null;
  travellingWith?: string | null;
  travelHistory?: string | null;
  dependents?: string | null;
  investments?: string | null;
  visaType?: string | null; // "schengen" | "generic"
  visaCountry?: string | null; // which country the file goes to
  travelPurpose?: string | null; // tourism | business | family
  hostInvite?: string | null;
  mostNightsCountry?: string | null;
  entryCountry?: string | null;
  minorParents?: string | null;
  travelFrom?: Date | null;
  travelTo?: Date | null;
  residenceCountry?: string | null;
  missingDocs?: string | null;
};

/** The documents the traveller said they don't have, as a list. */
export function missingDocList(a: Pick<ApplicantLite, "missingDocs">): string[] {
  return (a.missingDocs ?? "").split("|").map((s) => s.trim()).filter(Boolean);
}

type TripLite = {
  name: string;
  destination?: string | null;
  departureDate?: Date | null;
  endDate?: Date | null;
  itinerary?: { date?: Date | null; location: string; extra?: boolean; hotels?: { hotelName: string }[] }[];
};

const d = (x?: Date | null) => (x ? new Date(x).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "____________");
const dShort = (x?: Date | null) => (x ? new Date(x).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
const has = (s?: string | null) => !!(s && s.trim() && s.trim().toLowerCase() !== "no");
// "a Indian national" in a letter to an embassy is the kind of detail that
// makes the whole file look careless.
const nat = (n?: string | null) => { const v = (n || "Indian").trim(); return `${/^[aeiou]/i.test(v) ? "an" : "a"} ${v} national`; };

// `now` is a parameter rather than a constant because this decides whether the
// minor-consent documents appear — a date frozen in the source would quietly
// start getting it wrong the moment it went past.
export function ageFromDob(dob?: Date | null, now = new Date()): number | null {
  if (!dob) return null;
  let a = now.getFullYear() - new Date(dob).getFullYear();
  const m = now.getMonth() - new Date(dob).getMonth();
  if (m < 0 || (m === 0 && now.getDate() < new Date(dob).getDate())) a--;
  return a;
}

export function tripDuration(t: TripLite | null | undefined): number | null {
  if (!t?.departureDate || !t?.endDate) return null;
  return Math.max(1, Math.round((new Date(t.endDate).getTime() - new Date(t.departureDate).getTime()) / 864e5));
}

// When the dates are, whoever supplied them.
//
// A traveller who came through the agency's own link has no trip: they typed
// their own dates on the form. One booked onto a trip has the trip's. Everything
// downstream — the letter, the passport-validity check — reads them from here so
// neither case needs a special path.
export type Window = { from: Date | null; to: Date | null; days: number | null; tripName: string | null };

export function travelWindow(a: ApplicantLite, t?: TripLite | null): Window {
  const from = t?.departureDate ?? a.travelFrom ?? null;
  const to = t?.endDate ?? a.travelTo ?? null;
  const days = from && to ? Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 864e5)) : null;
  return { from, to, days, tripName: t?.name ?? null };
}

export function isSchengen(a: Pick<ApplicantLite, "visaType">) {
  return (a.visaType || "schengen") === "schengen";
}
export function visaLabel(a: Pick<ApplicantLite, "visaType" | "visaCountry" | "mostNightsCountry">) {
  if (!isSchengen(a)) return a.visaCountry?.trim() || "Visitor";
  // Which member state the file goes to matters more than the word "Schengen":
  // it decides the consulate, the appointment centre and half the checklist.
  const c = fileCountry(a);
  if (c) return `Schengen · ${c.name}${isAnySchengen(a.visaCountry) ? " (by nights)" : ""}`;
  return "Schengen · country not set";
}

// What the traveller's own documents call their visa. The desk's label carries
// working detail — which member state, and whether it was chosen or inferred
// from the nights — that means nothing to the applicant and only invites
// questions we'd rather answer ourselves.
export function travellerVisaLabel(a: Pick<ApplicantLite, "visaType" | "visaCountry">) {
  return isSchengen(a) ? "Schengen" : (a.visaCountry?.trim() || "visitor");
}

// ---- shared building blocks (country-agnostic) ----
function workLine(a: ApplicantLite): string {
  const type = a.employmentType || "employed";
  if (type === "business" || type === "self")
    return `I own and manage ${a.employer || "my own business"}${a.gstNo ? `, registered under GST no. ${a.gstNo}` : ""}${a.employerAddress ? `, based at ${a.employerAddress}` : ""}${a.income ? `, with an annual turnover/income of ${a.income}` : ""}. My business commitments require my presence in India, ensuring my timely return.`;
  if (type === "student") return `I am a student${a.employer ? ` at ${a.employer}` : ""}. My studies require my return to India by the end of my vacation.`;
  if (type === "retired") return `I am retired${a.income ? `, with a pension/income of ${a.income}` : ""}, and my life and family are firmly settled in India.`;
  if (type === "homemaker") return `I am a homemaker; my household and family responsibilities are in India and require my return.`;
  return `I am employed as ${a.occupation || "an employee"} at ${a.employer || "my organisation"}${a.employerAddress ? `, ${a.employerAddress}` : ""}${a.income ? `, with a monthly income of ${a.income}` : ""}. My employment requires my return to duty.`;
}
function fundingLine(a: ApplicantLite): string {
  return a.funding === "sponsor" && a.sponsorName
    ? `The trip is being sponsored by ${a.sponsorName}${a.sponsorRelation ? ` (my ${a.sponsorRelation})` : ""}, whose financial documents are enclosed.`
    : `I am financing this trip entirely from my own funds, and my bank statements and income proof are enclosed.`;
}
function tiesPara(a: ApplicantLite): string {
  const ties: string[] = [];
  if (has(a.dependents)) ties.push(`My ${a.dependents} remain in India throughout my travel, and I am fully committed to returning to them.`);
  if (has(a.investments)) ties.push(`I hold substantial assets and investments in India — ${a.investments} — which firmly root me to my home country.`);
  if (has(a.travelHistory)) ties.push(`My prior international travel (${a.travelHistory}) shows a consistent record of complying with visa conditions and returning home on time.`);
  return ties.length
    ? `I have strong personal, financial and professional ties to India. ${ties.join(" ")} I will return well before my visa expires.`
    : `I have strong personal and professional ties to my home country and I fully intend to return before the expiry of my visa.`;
}
// The travel paragraph. With a trip it names the tour and points at the
// itinerary below; without one the traveller's own dates carry it, and nothing
// is claimed about accommodation that hasn't been booked.
function tripPara(a: ApplicantLite, w: Window): string {
  const span = `from ${d(w.from)} to ${d(w.to)}${w.days ? ` (${w.days} days)` : ""}`;
  if (w.tripName)
    return `I intend to travel ${span} as part of the tour “${w.tripName}”. ${companion(a)} My day-by-day itinerary and confirmed accommodation are listed below.`;
  return `I intend to travel ${span}. ${companion(a)} My detailed itinerary and confirmed accommodation are enclosed with this application.`;
}

function companion(a: ApplicantLite): string {
  return !a.travellingWith || /alone|solo|single/i.test(a.travellingWith)
    ? "I am undertaking this trip as part of the group tour."
    : `I am travelling together with ${a.travellingWith}.`;
}

export type ChecklistItem = {
  label: string;
  note?: string;
  /** The agency produces this one — the traveller never goes and gets it. */
  by?: "agency";
  /** A note for the traveller's copy, where the agent's note says too much. */
  travellerNote?: string;
};

// Who is reading the list.
//
// The agency sees everything: which consulate the file belongs to, why, what the
// daily-funds figure is and where to check it. The traveller sees what they have
// to go and fetch — their documents — and not the handling that sits on top of
// it. That part is the agency's work and the reason the traveller came to them;
// printed on a checklist it reads like a do-it-yourself guide.
export type Audience = "agent" | "traveller";

// The traveller's copy of the list.
//
// Three things come off it. The "which country, and why" section, because that
// is the judgement the agency is being paid for and on a printed sheet it reads
// as instructions for doing this alone. The documents the agency itself
// produces, which move to a short closing block so the traveller can see the
// work is covered without seeing how. And the notes that send them to a
// consulate page to look a figure up — replaced by "we'll tell you".
function travellerView(groups: { title: string; items: ChecklistItem[] }[]) {
  const out: { title: string; items: ChecklistItem[] }[] = [];
  const ours: ChecklistItem[] = [];

  for (const g of groups) {
    if (g.title.startsWith("Applying to") || g.title.startsWith("Which country")) continue;
    const theirs: ChecklistItem[] = [];
    for (const it of g.items) {
      if (it.by === "agency") { ours.push({ label: it.label }); continue; }
      theirs.push({ label: it.label, note: it.travellerNote ?? it.note });
    }
    if (theirs.length) out.push({ title: g.title, items: theirs });
  }

  if (ours.length) out.push({ title: "We take care of these for you", items: ours });
  return out;
}

// The employment / sponsorship sections — shared across all visa types.
//
// These stack rather than replace each other. A business owner whose trip is
// being paid for still has to show the company: the sponsor's papers explain
// where the money comes from, the company's explain why the applicant goes home.
// Swapping one for the other, as this used to, quietly dropped the certificate
// of incorporation from every sponsored director's file.
function workSections(a: ApplicantLite): { title: string; items: ChecklistItem[] }[] {
  const type = a.employmentType || "employed";
  const out: { title: string; items: ChecklistItem[] }[] = [];

  if (a.funding === "sponsor")
    out.push({
      title: "Sponsorship",
      items: [
        { label: "Proof of sponsorship + signed letter from the sponsor" },
        { label: "Copy of the sponsor's photo ID (passport / residence-permit card)" },
        { label: "Sponsor's bank statement", note: "last 3 months, ALL pages STAMPED & SIGNED by the bank" },
        { label: "If the sponsor is your spouse — marriage certificate" },
      ],
    });

  if (type === "business" || type === "self")
    out.push({
      title: "Your company",
      items: [
        { label: "Certificate of incorporation", note: a.employer ? `for ${a.employer}` : undefined },
        { label: "GST certificate", note: a.gstNo ? `the certificate itself, for GST no. ${a.gstNo}` : "the registration certificate, not just the number" },
        { label: "Company bank statement — last 3 years", note: "ALL PAGES STAMPED & SIGNED by the bank" },
        { label: "Company Income Tax Returns — last 3 years", note: "barcode-verifiable" },
      ],
    });
  else if (type === "student")
    out.push({ title: "Student", items: [{ label: "Certificate from the institution where you are enrolled" }] });
  else if (type === "retired")
    out.push({ title: "Retired", items: [{ label: "Pension statements for the last 3 months" }, { label: "Proof of regular income from property or business ownership" }] });
  else if (type === "homemaker")
    out.push({ title: "Homemaker", items: [{ label: "Marriage certificate" }] });
  else if (a.funding !== "sponsor")
    out.push({ title: "Employment", items: [{ label: "Pay slips for the last 3 months" }, { label: "Employment contract" }, { label: "Leave-approval / NOC letter from your employer" }] });
  else
    out.push({ title: "Employment", items: [{ label: "Leave-approval / NOC letter from your employer" }] });

  return out;
}

function tiesItems(a: ApplicantLite): ChecklistItem[] {
  const ties: ChecklistItem[] = [];
  if (has(a.investments)) ties.push({ label: "Proof of investments / assets", note: a.investments || undefined });
  if (has(a.dependents)) ties.push({ label: "Proof of family staying in India (ties to home)", note: a.dependents || undefined });
  return ties;
}

// Why the trip is being made. Tourism needs nothing extra; the other two both
// turn on a second party whose own paperwork the consulate wants to see.
function purposeSection(a: ApplicantLite): { title: string; items: ChecklistItem[] } | null {
  const p = (a.travelPurpose || "tourism").toLowerCase();
  if (p === "business")
    return {
      title: "Because this is a business trip",
      items: [
        { label: "Invitation letter from the host company", note: a.hostInvite ? `from ${a.hostInvite} — on letterhead, stating the purpose, the dates, and who bears the costs` : "on letterhead, stating the purpose, the dates, and who bears the costs" },
        { label: "Letter from your own employer", note: "confirming your position, that the trip is on the company's behalf, and which costs it covers" },
        { label: "Proof of the business relationship", note: "contract, purchase order, prior correspondence or trade-fair registration" },
      ],
    };
  if (p === "family")
    return {
      title: "Because you are visiting family or friends",
      items: [
        { label: "Invitation letter from your host", note: a.hostInvite ? `from ${a.hostInvite} — with their address and the dates you will stay` : "with their address and the dates you will stay" },
        { label: "Copy of the host's passport / residence permit", note: "showing they are legally resident there" },
        { label: "Proof of your relationship to the host", note: "birth or marriage certificate, or photographs and correspondence for a friend" },
        { label: "Proof of the accommodation they are providing", note: "their tenancy agreement or property document, if you are staying with them" },
      ],
    };
  return null;
}

function conditionalItems(a: ApplicantLite): ChecklistItem[] {
  const conditional: ChecklistItem[] = [];
  const age = ageFromDob(a.dob);
  if (age != null && age < 18) {
    conditional.push({ label: "Notarised parental consent", note: "from the non-travelling parent if travelling with one parent; from BOTH parents if travelling alone (or court order if one parent has sole custody)" });
    conditional.push({ label: "Photocopies of both parents' passports / photo IDs (or the minor's birth certificate)", note: a.minorParents || undefined });
    conditional.push({ label: "Birth certificate of the applicant", note: "showing both parents' names" });
  }
  const ms = (a.maritalStatus || "").toLowerCase();
  const withSpouse = /\b(spouse|husband|wife|partner)\b/i.test(a.travellingWith || "");
  if (ms === "married" && withSpouse && a.funding !== "sponsor") conditional.push({ label: "Marriage certificate", note: "you're travelling with your spouse" });
  if (ms === "separated") conditional.push({ label: "Proof of separation", note: "legal separation document / court order" });
  return conditional;
}

// ======================= dispatch =======================
export function visaCoverLetter(a: ApplicantLite, t?: TripLite | null) {
  return isSchengen(a) ? schengenCoverLetter(a, t) : genericCoverLetter(a, t);
}
export function visaChecklist(a: ApplicantLite, audience: Audience = "agent"): { title: string; items: ChecklistItem[] }[] {
  return isSchengen(a) ? schengenChecklist(a, audience) : genericChecklist(a, audience);
}

// ======================= Schengen =======================
function schengenCoverLetter(a: ApplicantLite, t?: TripLite | null) {
  // Undecided is a real state, not an error: the letter leaves the consulate and
  // the destination blank to be filled rather than naming a country nobody chose.
  const country = fileCountry(a);
  const dest = country?.name ?? "the Schengen area";
  const nights = (t?.itinerary || []).filter((n) => !n.extra);
  const w = travelWindow(a, t);
  const longTerm = !!a.wantsLongTerm && has(a.prevSchengen);
  const schengenPara = has(a.prevSchengen)
    ? `I have previously held a Schengen visa (${a.prevSchengen}), which I used and honoured fully.${longTerm ? " In view of my compliant travel record, I respectfully request a long-term multiple-entry visa, and I have obtained travel medical insurance valid for one year in support of this request." : ""}`
    : `This is my first application for a Schengen visa.`;
  const applyType = longTerm ? "a long-term multiple-entry Schengen tourist visa" : "a short-stay Schengen tourist visa";

  const paragraphs = [
    `I, ${a.fullName}, holder of passport number ${a.passportNo || "____________"} (issued at ${a.passportPlace || "____________"} on ${d(a.passportIssue)}, valid until ${d(a.passportExpiry)}), ${nat(a.nationality)}, born on ${d(a.dob)} at ${a.placeOfBirth || "____________"}, residing at ${[a.address, a.city, a.pin].filter(Boolean).join(", ") || "____________"}, respectfully apply for ${applyType} to visit ${dest}.`,
    tripPara(a, w),
    `${workLine(a)} ${fundingLine(a)}`,
    `${tiesPara(a)} ${schengenPara}`,
    `All required supporting documents are enclosed with this application. I kindly request you to grant me the visa, and I thank you for your consideration.`,
  ];
  return {
    subject: `Application for Schengen (Tourist) Visa — ${a.fullName}`,
    salutation: country ? `To the Visa Officer, ${country.consulate}` : "To the Visa Officer, ____________________",
    paragraphs,
    itinerary: nights.map((n, i) => ({ day: i + 1, date: dShort(n.date), location: n.location, hotel: (n.hotels || []).map((h) => h.hotelName).join(", ") || "—" })),
    sign: { name: a.fullName, contact: [a.phone, a.email].filter(Boolean).join(" · ") },
  };
}

// The common Schengen requirements, which are set in the Visa Code and are the
// same whichever member state you apply to, plus the handful of things that do
// change by country — who the file is addressed to, which portal hosts the form,
// and the daily funds the consulate wants to see. Those come from the country
// profile in lib/schengen.ts.
//
// Consulates revise their lists without notice, so this is a working list to
// collect against, not the authority. Check it off against the current VFS /
// consulate checklist for the country and city before the appointment.
function schengenChecklist(a: ApplicantLite, audience: Audience = "agent"): { title: string; items: ChecklistItem[] }[] {
  const chosen = fileCountry(a);
  // Everything below the "which country" question is common to all 29 states, so
  // an undecided file still has a complete, useful list — it is only the
  // consulate, the form's home and the daily figure that wait on the answer.
  const country = chosen ?? { code: "", name: "the country you apply to", consulate: "", dailyFunds: undefined, portal: undefined };
  const travelled = has(a.travelHistory) || has(a.prevSchengen);
  const longTerm = !!a.wantsLongTerm && has(a.prevSchengen);
  const core: ChecklistItem[] = [
    { label: "Passport", note: "valid ≥ 3 months beyond departure from Schengen, issued within the last 10 years, min 2 blank pages" },
    { label: "Copies of previous Schengen visas & entry/exit stamps", note: travelled ? "you indicated prior travel — include copies of those visas/stamps from current & old passports" : "from current & old passports, if you have ever travelled to the Schengen area" },
    { label: "Schengen visa application form — printed & signed", note: country.portal ? `plus the confirmation of the online form submitted at ${country.portal}` : `the form for ${country.name}, downloaded from its consulate or the VFS page for your city`, travellerNote: "we prepare it — you sign it" },
    { label: "Passport photograph", note: "3.5 × 4.5 cm, white background, taken within the last 6 months (one is asked for — carry 2)" },
    { label: "Travel medical insurance", by: "agency", note: longTerm ? "for the LONG-TERM multiple-entry visa, the policy must cover ≥ €30,000 and be VALID FOR 1 YEAR (all Schengen countries, all risks)" : "the POLICY (an insurance card is not enough) covering ≥ €30,000 for all risks, valid across all Schengen countries for the whole trip incl. arrival & departure dates" },
    { label: "Round-trip flight reservation", by: "agency", note: "with PNR and the traveller's name" },
    { label: "Proof of accommodation — hotel bookings / itinerary", by: "agency", note: "we provide this from your trip" },
    { label: "Cover letter", by: "agency", note: "purpose, duration, accompanying persons, transport & accommodation — we generate this" },
    { label: "Personal bank statement — last 3 years", note: "showing movements — ALL PAGES must be STAMPED & SIGNED by the bank (required of every applicant, even if sponsored)" },
    { label: "Income Tax Return (ITR) acknowledgment — last 3 years", note: "barcode-verifiable" },
    {
      label: "Proof of sufficient funds",
      note: country.dailyFunds
        ? `the statement must show ${country.dailyFunds} for the stay`
        : `enough to cover the whole stay — ${country.name} publishes a figure per day; confirm the current one on its consulate or VFS page before the appointment`,
      travellerNote: "enough to cover the whole stay — we'll tell you the figure to hold",
    },
  ];
  const groups = [
    {
      title: chosen ? `Applying to ${chosen.name}` : "Which country to apply to — still open",
      items: (chosen
        ? [
            { label: `The file is addressed to the ${chosen.consulate}`, note: "we address the cover letter accordingly" },
            { label: `${chosen.name} must be the right country to apply to`, note: `apply where you spend the most nights; if the nights are equal, apply where you first enter the Schengen area. Applying to the wrong member state gets the file returned.` },
          ]
        : [
            { label: "Tell us which country you'll spend the most nights in", note: "that is the one the application must go to — we can't address the letter or name the right visa centre until we know" },
            { label: "If the nights are equal, tell us where you land first", note: "that becomes the deciding country instead" },
          ]
      ).concat([
        { label: "Appointment at the visa centre, in person", note: "biometrics (fingerprints and photo) are taken there and can't be sent in" },
      ]) as ChecklistItem[],
    },
    { title: "Core documents (every applicant)", items: core },
    ...workSections(a),
  ];
  const purpose = purposeSection(a);
  if (purpose) groups.push(purpose);
  const ties = tiesItems(a);
  const conditional = conditionalItems(a);
  if (ties.length) groups.push({ title: "Ties to home (strengthens your case)", items: ties });
  if (conditional.length) groups.push({ title: "Because of your details", items: conditional });
  return audience === "traveller" ? travellerView(groups) : groups;
}

// ======================= Generic (any country) =======================
function genericCoverLetter(a: ApplicantLite, t?: TripLite | null) {
  const country = a.visaCountry?.trim() || t?.destination || "the destination country";
  const nights = (t?.itinerary || []).filter((n) => !n.extra);
  const w = travelWindow(a, t);
  const historyPara = has(a.travelHistory)
    ? `My previous international travel (${a.travelHistory}) reflects a consistent record of honouring visa conditions and returning home on time.`
    : "";
  const paragraphs = [
    `I, ${a.fullName}, holder of passport number ${a.passportNo || "____________"} (issued at ${a.passportPlace || "____________"} on ${d(a.passportIssue)}, valid until ${d(a.passportExpiry)}), ${nat(a.nationality)}, born on ${d(a.dob)} at ${a.placeOfBirth || "____________"}, residing at ${[a.address, a.city, a.pin].filter(Boolean).join(", ") || "____________"}, respectfully apply for a visitor (tourist) visa to ${country}.`,
    tripPara(a, w),
    `${workLine(a)} ${fundingLine(a)}`,
    `${tiesPara(a)} ${historyPara}`.trim(),
    `This is a genuine leisure visit and I will return to India before my visa expires. All required supporting documents are enclosed. I kindly request you to grant me the visa, and I thank you for your consideration.`,
  ];
  return {
    subject: `Application for ${country} Visitor Visa — ${a.fullName}`,
    salutation: `To the Visa Officer, Consulate / Embassy of ${country}`,
    paragraphs,
    itinerary: nights.map((n, i) => ({ day: i + 1, date: dShort(n.date), location: n.location, hotel: (n.hotels || []).map((h) => h.hotelName).join(", ") || "—" })),
    sign: { name: a.fullName, contact: [a.phone, a.email].filter(Boolean).join(" · ") },
  };
}

// A universal visitor-visa checklist that fits most countries. Country-specific
// rules (photo size, exact fund thresholds, medicals) should be verified against
// that country's official immigration site — noted on the document.
function genericChecklist(a: ApplicantLite, audience: Audience = "agent"): { title: string; items: ChecklistItem[] }[] {
  const country = a.visaCountry?.trim() || "the destination country";
  const travelled = has(a.travelHistory);
  const core: ChecklistItem[] = [
    { label: "Passport", note: "valid for at least 6 months beyond your return, with min 2 blank pages" },
    { label: `${country} visa application form — completed & signed`, note: `filled online/paper on ${country}'s official immigration portal, with the submission confirmation`, travellerNote: "we prepare it — you sign it" },
    { label: "Recent passport photographs", note: `as per ${country}'s photo specification (carry 2)` },
    { label: "Confirmed return / round-trip flight itinerary", by: "agency", note: "with PNR and the traveller's name" },
    { label: "Proof of accommodation — hotel bookings / itinerary", by: "agency", note: "we provide this from your trip" },
    { label: "Cover letter", by: "agency", note: "purpose, duration, who you travel with, transport & accommodation — we generate this" },
    { label: "Personal bank statement — last 3 years", note: "showing sufficient balance and regular activity — get it STAMPED & SIGNED by the bank" },
    { label: "Income Tax Returns (ITR) — last 3 years", note: "barcode-verifiable" },
    { label: "Proof of sufficient funds for the trip", note: "salary slips / savings; some countries require a minimum daily amount — verify the current figure", travellerNote: "salary slips / savings — we'll tell you the figure to hold" },
    { label: "Travel insurance", by: "agency", note: "recommended for all trips; required by some countries — confirm the minimum cover" },
  ];
  if (travelled) core.push({ label: "Copies of previous visas & entry/exit stamps", note: `from current & old passports (you indicated prior travel: ${a.travelHistory})` });

  const groups = [{ title: `Core documents for ${country} (every applicant)`, items: core }, ...workSections(a)];
  const purpose = purposeSection(a);
  if (purpose) groups.push(purpose);
  const ties = tiesItems(a);
  const conditional = conditionalItems(a);
  if (ties.length) groups.push({ title: "Ties to home (strengthens your case)", items: ties });
  if (conditional.length) groups.push({ title: "Because of your details", items: conditional });
  return audience === "traveller" ? travellerView(groups) : groups;
}

// ======================= due diligence =======================
// What the operator needs to look at before the file is sent anywhere. These
// are the things that get an application returned or refused on paperwork
// rather than on merit, and all of them are visible from the form answers.
export type VisaFlag = { level: "stop" | "check"; text: string };

const MIN_PASSPORT_MONTHS = 3; // Schengen wants validity 3 months past departure

export function visaFlags(a: ApplicantLite, t?: TripLite | null, now = new Date()): VisaFlag[] {
  const flags: VisaFlag[] = [];
  const schengen = isSchengen(a);
  const country = fileCountry(a);
  const undecided = schengen && isAnySchengen(a.visaCountry);
  const w = travelWindow(a, t);
  const end = w.to ? new Date(w.to) : null;

  // --- the passport itself ---
  if (!a.passportNo) flags.push({ level: "check", text: "No passport number on the form." });
  if (!a.passportExpiry) {
    flags.push({ level: "check", text: "No passport expiry date — can't confirm the passport is valid long enough." });
  } else if (end) {
    const need = new Date(end);
    need.setMonth(need.getMonth() + MIN_PASSPORT_MONTHS);
    if (new Date(a.passportExpiry) < need)
      flags.push({ level: "stop", text: `Passport expires ${d(a.passportExpiry)} — it must stay valid until at least ${d(need)} (${MIN_PASSPORT_MONTHS} months past the return). Renew before applying.` });
  }
  if (a.passportIssue) {
    const tenYears = new Date(a.passportIssue);
    tenYears.setFullYear(tenYears.getFullYear() + 10);
    if (tenYears < now) flags.push({ level: "stop", text: `Passport was issued ${d(a.passportIssue)}, more than 10 years ago — it won't be accepted.` });
  }
  if (a.passportExpiry && a.passportIssue && new Date(a.passportExpiry) < new Date(a.passportIssue))
    flags.push({ level: "check", text: "Passport issue and expiry dates look swapped." });

  // --- is this even the right consulate? ---
  if (schengen && !has(a.mostNightsCountry)) {
    flags.push({
      level: undecided ? "stop" : "check",
      text: undecided
        ? "No country chosen and no idea where the most nights are — until one of those is known there is no consulate to send this to."
        : "Not told which country has the most nights, so we can't confirm the file is going to the right consulate.",
    });
  } else if (schengen && !undecided && country) {
    // Only a traveller who NAMED a country can have named the wrong one. Where
    // they left it open, the nights simply decide and there is nothing to query.
    const most = schengenCountry(a.mostNightsCountry);
    if (most.name.toLowerCase() !== country.name.toLowerCase())
      flags.push({
        level: "stop",
        text: `Applying to ${country.name}, but the most nights are in ${a.mostNightsCountry}. The application belongs to ${most.name} — ${country.name} would return it.`,
      });
  }

  // --- who they are ---
  const age = ageFromDob(a.dob, now);
  if (age == null) flags.push({ level: "check", text: "No date of birth." });
  if (age != null && age < 18 && !has(a.minorParents))
    flags.push({ level: "check", text: "Applicant is a minor and no parent details were given — consent documents will be needed from both parents." });

  // --- the money ---
  if (a.funding === "sponsor" && !has(a.sponsorName))
    flags.push({ level: "check", text: "Says a sponsor is paying but hasn't named them — the sponsorship letter and bank statement can't be collected yet." });
  if (!has(a.income)) flags.push({ level: "check", text: "No income stated; funds will rest entirely on the bank statement." });

  // --- the second party, when there is one ---
  const purpose = (a.travelPurpose || "tourism").toLowerCase();
  if (purpose !== "tourism" && !has(a.hostInvite))
    flags.push({ level: "check", text: `Travelling for ${purpose === "business" ? "business" : "family or friends"} but no host named — the invitation letter is the document this file turns on.` });

  // --- what they told us they can't produce ---
  const missing = missingDocList(a);
  if (missing.length)
    flags.push({
      level: "check",
      text: `Says they don't have ${missing.length} of the documents yet: ${missing.slice(0, 3).join("; ")}${missing.length > 3 ? `, and ${missing.length - 3} more` : ""}.`,
    });

  // --- the record ---
  if (schengen && !has(a.prevSchengen) && !has(a.travelHistory))
    flags.push({ level: "check", text: "First international trip on record. Expect closer scrutiny of funds and ties — the ties section of the form is worth filling properly." });
  if (!!a.wantsLongTerm && !has(a.prevSchengen))
    flags.push({ level: "check", text: "Asking for a long-term multiple-entry visa without a previous Schengen visa; that is rarely granted on a first application." });

  // --- and the obvious one ---
  if (!w.from || !w.to)
    flags.push({ level: "check", text: w.tripName ? "The trip has no fixed dates yet, and the application needs them." : "No travel dates given, and the application needs them." });

  return flags;
}

// The checklist flattened into rows, for the table on the Visa desk.
export type RequirementRow = { group: string; label: string; note?: string };

export function visaRequirementRows(a: ApplicantLite): RequirementRow[] {
  return visaChecklist(a).flatMap((g) => g.items.map((it) => ({ group: g.title, label: it.label, note: it.note })));
}
