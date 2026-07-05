// Generates a visa cover letter + document checklist by merging what the applicant
// filled with the trip data already in Trip Desk. Supports Schengen (accurate, from
// the official Embassy of Iceland / VFS checklist) and a GENERIC visitor-visa
// template for any other country (New Zealand, UK, USA, …). The visa type is chosen
// when the operator shares the link and is stored on the applicant.

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
  visaCountry?: string | null; // country name for the generic template
};

type TripLite = {
  name: string;
  destination?: string | null;
  departureDate?: Date | null;
  endDate?: Date | null;
  itinerary?: { date?: Date | null; location: string; extra?: boolean; hotels?: { hotelName: string }[] }[];
};

const d = (x?: Date | null) => (x ? new Date(x).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "____________");
const dShort = (x?: Date | null) => (x ? new Date(x).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const has = (s?: string | null) => !!(s && s.trim() && s.trim().toLowerCase() !== "no");

export function ageFromDob(dob?: Date | null): number | null {
  if (!dob) return null;
  const now = new Date("2026-06-30");
  let a = now.getFullYear() - new Date(dob).getFullYear();
  const m = now.getMonth() - new Date(dob).getMonth();
  if (m < 0 || (m === 0 && now.getDate() < new Date(dob).getDate())) a--;
  return a;
}

export function tripDuration(t: TripLite): number | null {
  if (!t.departureDate || !t.endDate) return null;
  return Math.max(1, Math.round((new Date(t.endDate).getTime() - new Date(t.departureDate).getTime()) / 864e5));
}

export function isSchengen(a: Pick<ApplicantLite, "visaType">) {
  return (a.visaType || "schengen") === "schengen";
}
export function visaLabel(a: Pick<ApplicantLite, "visaType" | "visaCountry">) {
  return isSchengen(a) ? "Schengen" : (a.visaCountry?.trim() || "Visitor");
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
function companion(a: ApplicantLite): string {
  return !a.travellingWith || /alone|solo|single/i.test(a.travellingWith)
    ? "I am undertaking this trip as part of the group tour."
    : `I am travelling together with ${a.travellingWith}.`;
}

export type ChecklistItem = { label: string; note?: string };

// The employment / sponsorship section — shared across all visa types.
function workSection(a: ApplicantLite): { title: string; items: ChecklistItem[] } {
  const type = a.employmentType || "employed";
  if (a.funding === "sponsor")
    return {
      title: "Sponsorship",
      items: [
        { label: "Proof of sponsorship + signed letter from the sponsor" },
        { label: "Copy of the sponsor's photo ID (passport / residence-permit card)" },
        { label: "Sponsor's bank statement", note: "last 3 months, ALL pages STAMPED & SIGNED by the bank" },
        { label: "If the sponsor is your spouse — marriage certificate" },
        { label: "Your own employment / business proof (as applicable)" },
      ],
    };
  if (type === "business" || type === "self")
    return {
      title: "Business (self-employed)",
      items: [
        { label: "Certificate of registration of the company", note: a.gstNo ? `including GST no. ${a.gstNo}` : "including the GST registration number (for India-based companies)" },
        { label: "Business bank account statement", note: "STAMPED & SIGNED by the bank" },
        { label: "Income Tax Return, last 2 assessment years", note: "barcode-verifiable" },
      ],
    };
  if (type === "student")
    return { title: "Student", items: [{ label: "Certificate from the institution where you are enrolled" }, { label: "Sponsor's (parent) documents — sponsorship letter, photo-ID copy, and bank-stamped statement" }] };
  if (type === "retired")
    return { title: "Retired", items: [{ label: "Pension statements for the last 3 months" }, { label: "Proof of regular income from property or business ownership" }] };
  if (type === "homemaker")
    return { title: "Homemaker", items: [{ label: "Spouse's sponsorship — signed letter + photo-ID copy + bank-stamped statement" }, { label: "Marriage certificate" }] };
  return { title: "Employment", items: [{ label: "Pay slips for the last 3 months" }, { label: "Employment contract" }, { label: "Leave-approval / NOC letter from your employer" }] };
}

function tiesItems(a: ApplicantLite): ChecklistItem[] {
  const ties: ChecklistItem[] = [];
  if (has(a.investments)) ties.push({ label: "Proof of investments / assets", note: a.investments || undefined });
  if (has(a.dependents)) ties.push({ label: "Proof of family staying in India (ties to home)", note: a.dependents || undefined });
  return ties;
}

function conditionalItems(a: ApplicantLite): ChecklistItem[] {
  const conditional: ChecklistItem[] = [];
  const age = ageFromDob(a.dob);
  if (age != null && age < 18) {
    conditional.push({ label: "Notarised parental consent", note: "from the non-travelling parent if travelling with one parent; from BOTH parents if travelling alone (or court order if one parent has sole custody)" });
    conditional.push({ label: "Photocopies of both parents' passports / photo IDs (or the minor's birth certificate)" });
  }
  const ms = (a.maritalStatus || "").toLowerCase();
  const withSpouse = /\b(spouse|husband|wife|partner)\b/i.test(a.travellingWith || "");
  if (ms === "married" && withSpouse && a.funding !== "sponsor") conditional.push({ label: "Marriage certificate", note: "you're travelling with your spouse" });
  if (ms === "separated") conditional.push({ label: "Proof of separation", note: "legal separation document / court order" });
  return conditional;
}

// ======================= dispatch =======================
export function visaCoverLetter(a: ApplicantLite, t: TripLite) {
  return isSchengen(a) ? schengenCoverLetter(a, t) : genericCoverLetter(a, t);
}
export function visaChecklist(a: ApplicantLite): { title: string; items: ChecklistItem[] }[] {
  return isSchengen(a) ? schengenChecklist(a) : genericChecklist(a);
}

// ======================= Schengen =======================
function schengenCoverLetter(a: ApplicantLite, t: TripLite) {
  const dest = t.destination || "Iceland";
  const nights = (t.itinerary || []).filter((n) => !n.extra);
  const days = tripDuration(t);
  const longTerm = !!a.wantsLongTerm && has(a.prevSchengen);
  const schengenPara = has(a.prevSchengen)
    ? `I have previously held a Schengen visa (${a.prevSchengen}), which I used and honoured fully.${longTerm ? " In view of my compliant travel record, I respectfully request a long-term multiple-entry visa, and I have obtained travel medical insurance valid for one year in support of this request." : ""}`
    : `This is my first application for a Schengen visa.`;
  const applyType = longTerm ? "a long-term multiple-entry Schengen tourist visa" : "a short-stay Schengen tourist visa";

  const paragraphs = [
    `I, ${a.fullName}, holder of passport number ${a.passportNo || "____________"} (issued at ${a.passportPlace || "____________"} on ${d(a.passportIssue)}, valid until ${d(a.passportExpiry)}), a citizen of ${a.nationality || "India"}, born on ${d(a.dob)} at ${a.placeOfBirth || "____________"}, residing at ${[a.address, a.city, a.pin].filter(Boolean).join(", ") || "____________"}, respectfully apply for ${applyType} to visit ${dest}.`,
    `I intend to travel from ${d(t.departureDate)} to ${d(t.endDate)}${days ? ` (${days} days)` : ""} as part of a self-drive group tour, “${t.name}”. ${companion(a)} My day-by-day itinerary and confirmed accommodation are listed below.`,
    `${workLine(a)} ${fundingLine(a)}`,
    `${tiesPara(a)} ${schengenPara}`,
    `All required supporting documents are enclosed with this application. I kindly request you to grant me the visa, and I thank you for your consideration.`,
  ];
  return {
    subject: `Application for Schengen (Tourist) Visa — ${a.fullName}`,
    salutation: "To the Visa Officer, Embassy of Iceland / VFS Global",
    paragraphs,
    itinerary: nights.map((n, i) => ({ day: i + 1, date: dShort(n.date), location: n.location, hotel: (n.hotels || []).map((h) => h.hotelName).join(", ") || "—" })),
    sign: { name: a.fullName, contact: [a.phone, a.email].filter(Boolean).join(" · ") },
  };
}

// Based on the official Embassy of Iceland / VFS Global checklist for India
// (Tourism/Business, Feb 2025). Verify against the current VFS list each season.
function schengenChecklist(a: ApplicantLite): { title: string; items: ChecklistItem[] }[] {
  const travelled = has(a.travelHistory) || has(a.prevSchengen);
  const core: ChecklistItem[] = [
    { label: "Passport", note: "valid ≥ 3 months beyond departure from Schengen, issued within the last 10 years, min 2 blank pages" },
    { label: "Copies of previous Schengen visas & entry/exit stamps", note: travelled ? "you indicated prior travel — include copies of those visas/stamps from current & old passports" : "from current & old passports, if you have ever travelled to the Schengen area" },
    { label: "Schengen visa application form — printed & signed", note: "plus the confirmation of the online form submitted at visa.government.is" },
    { label: "Passport photograph", note: "3.5 × 4.5 cm, white background, taken within the last 6 months (official asks 1 — carry 2)" },
    { label: "Travel medical insurance", note: (!!a.wantsLongTerm && has(a.prevSchengen)) ? "for the LONG-TERM multiple-entry visa, the policy must cover ≥ €30,000 and be VALID FOR 1 YEAR (all Schengen countries, all risks)" : "the POLICY (an insurance card is not enough) covering ≥ €30,000 for all risks, valid across all Schengen countries for the whole trip incl. arrival & departure dates" },
    { label: "Round-trip flight reservation", note: "with PNR and the traveller's name" },
    { label: "Proof of accommodation — hotel bookings / itinerary", note: "we provide this from your trip" },
    { label: "Cover letter", note: "purpose, duration, accompanying persons, transport & accommodation — we generate this" },
    { label: "Original personal bank statement", note: "last 3 months showing movements — ALL PAGES must be STAMPED & SIGNED by the bank (required of every applicant, even if sponsored)" },
    { label: "Indian Income Tax Return (ITR) acknowledgment", note: "last 2 assessment years, barcode-verifiable" },
    { label: "Proof of sufficient funds", note: "statement must show ≥ 8,000 ISK/day (≈ €58) for the stay, or 4,000 ISK/day if a third party bears your expenses" },
  ];
  const groups = [{ title: "Core documents (every applicant)", items: core }, workSection(a)];
  const ties = tiesItems(a);
  const conditional = conditionalItems(a);
  if (ties.length) groups.push({ title: "Ties to home (strengthens your case)", items: ties });
  if (conditional.length) groups.push({ title: "Because of your details", items: conditional });
  return groups;
}

// ======================= Generic (any country) =======================
function genericCoverLetter(a: ApplicantLite, t: TripLite) {
  const country = a.visaCountry?.trim() || t.destination || "the destination country";
  const nights = (t.itinerary || []).filter((n) => !n.extra);
  const days = tripDuration(t);
  const historyPara = has(a.travelHistory)
    ? `My previous international travel (${a.travelHistory}) reflects a consistent record of honouring visa conditions and returning home on time.`
    : "";
  const paragraphs = [
    `I, ${a.fullName}, holder of passport number ${a.passportNo || "____________"} (issued at ${a.passportPlace || "____________"} on ${d(a.passportIssue)}, valid until ${d(a.passportExpiry)}), a citizen of ${a.nationality || "India"}, born on ${d(a.dob)} at ${a.placeOfBirth || "____________"}, residing at ${[a.address, a.city, a.pin].filter(Boolean).join(", ") || "____________"}, respectfully apply for a visitor (tourist) visa to ${country}.`,
    `I intend to travel from ${d(t.departureDate)} to ${d(t.endDate)}${days ? ` (${days} days)` : ""} as part of the tour “${t.name}”. ${companion(a)} My day-by-day itinerary and confirmed accommodation are listed below.`,
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
function genericChecklist(a: ApplicantLite): { title: string; items: ChecklistItem[] }[] {
  const country = a.visaCountry?.trim() || "the destination country";
  const travelled = has(a.travelHistory);
  const core: ChecklistItem[] = [
    { label: "Passport", note: "valid for at least 6 months beyond your return, with min 2 blank pages" },
    { label: `${country} visa application form — completed & signed`, note: `filled online/paper on ${country}'s official immigration portal, with the submission confirmation` },
    { label: "Recent passport photographs", note: `as per ${country}'s photo specification (carry 2)` },
    { label: "Confirmed return / round-trip flight itinerary", note: "with PNR and the traveller's name" },
    { label: "Proof of accommodation — hotel bookings / itinerary", note: "we provide this from your trip" },
    { label: "Cover letter", note: "purpose, duration, who you travel with, transport & accommodation — we generate this" },
    { label: "Personal bank statement", note: "last 3–6 months showing sufficient balance and regular activity — get it STAMPED & SIGNED by the bank" },
    { label: "Income Tax Returns (ITR)", note: "last 2 assessment years" },
    { label: "Proof of sufficient funds for the trip", note: "salary slips / savings; some countries require a minimum daily amount — verify the current figure" },
    { label: "Travel insurance", note: "recommended for all trips; required by some countries — confirm the minimum cover" },
  ];
  if (travelled) core.push({ label: "Copies of previous visas & entry/exit stamps", note: `from current & old passports (you indicated prior travel: ${a.travelHistory})` });

  const groups = [{ title: `Core documents for ${country} (every applicant)`, items: core }, workSection(a)];
  const ties = tiesItems(a);
  const conditional = conditionalItems(a);
  if (ties.length) groups.push({ title: "Ties to home (strengthens your case)", items: ties });
  if (conditional.length) groups.push({ title: "Because of your details", items: conditional });
  return groups;
}
