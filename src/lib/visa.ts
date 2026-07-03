// Generates a standard Schengen (tourist) visa cover letter + document checklist
// by merging what the applicant filled with the trip data already in Trip Desk.

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
  travelHistory?: string | null;
  dependents?: string | null;
  investments?: string | null;
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

export function visaCoverLetter(a: ApplicantLite, t: TripLite) {
  const dest = t.destination || "Iceland";
  const nights = (t.itinerary || []).filter((n) => !n.extra);
  const days = tripDuration(t);
  const type = a.employmentType || "employed";

  const fundingLine =
    a.funding === "sponsor" && a.sponsorName
      ? `The trip is being sponsored by ${a.sponsorName}${a.sponsorRelation ? ` (my ${a.sponsorRelation})` : ""}, whose financial documents are enclosed.`
      : `I am financing this trip entirely from my own funds, and my bank statements and income proof are enclosed.`;

  const workLine =
    type === "business" || type === "self"
      ? `I own and manage ${a.employer || "my own business"}${a.gstNo ? `, registered under GST no. ${a.gstNo}` : ""}${a.employerAddress ? `, based at ${a.employerAddress}` : ""}${a.income ? `, with an annual turnover/income of ${a.income}` : ""}. My business commitments require my presence in India, ensuring my timely return.`
      : type === "student"
      ? `I am a student${a.employer ? ` at ${a.employer}` : ""}. My studies require my return to India by the end of my vacation.`
      : type === "retired"
      ? `I am retired${a.income ? `, with a pension/income of ${a.income}` : ""}, and my life and family are firmly settled in India.`
      : type === "homemaker"
      ? `I am a homemaker; my household and family responsibilities are in India and require my return.`
      : `I am employed as ${a.occupation || "an employee"} at ${a.employer || "my organisation"}${a.employerAddress ? `, ${a.employerAddress}` : ""}${a.income ? `, with a monthly income of ${a.income}` : ""}. My employment requires my return to duty.`;

  // Ties-to-home paragraph, assembled from whatever strengthens the case.
  const ties: string[] = [];
  if (has(a.dependents)) ties.push(`My ${a.dependents} remain in India throughout my travel, and I am fully committed to returning to them.`);
  if (has(a.investments)) ties.push(`I hold substantial assets and investments in India — ${a.investments} — which firmly root me to my home country.`);
  if (has(a.travelHistory)) ties.push(`My prior international travel (${a.travelHistory}) shows a consistent record of complying with visa conditions and returning home on time.`);
  const tiesPara = ties.length
    ? `I have strong personal, financial and professional ties to India. ${ties.join(" ")} I will return well before my visa expires.`
    : `I have strong personal and professional ties to my home country and I fully intend to return before the expiry of my visa.`;

  const schengenPara = has(a.prevSchengen)
    ? `I have previously held a Schengen visa (${a.prevSchengen}), which I used and honoured fully.`
    : `This is my first application for a Schengen visa.`;

  const paragraphs = [
    `I, ${a.fullName}, holder of passport number ${a.passportNo || "____________"} (issued at ${a.passportPlace || "____________"} on ${d(a.passportIssue)}, valid until ${d(a.passportExpiry)}), a citizen of ${a.nationality || "India"}, born on ${d(a.dob)} at ${a.placeOfBirth || "____________"}, residing at ${[a.address, a.city, a.pin].filter(Boolean).join(", ") || "____________"}, respectfully apply for a short-stay Schengen tourist visa to visit ${dest}.`,
    `I intend to travel from ${d(t.departureDate)} to ${d(t.endDate)}${days ? ` (${days} days)` : ""} as part of a self-drive group tour, “${t.name}”. My day-by-day itinerary and confirmed accommodation are listed below.`,
    `${workLine} ${fundingLine}`,
    `${tiesPara} ${schengenPara}`,
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

export type ChecklistItem = { label: string; note?: string };
export function visaChecklist(a: ApplicantLite): { title: string; items: ChecklistItem[] }[] {
  const age = ageFromDob(a.dob);
  const type = a.employmentType || "employed";
  const core: ChecklistItem[] = [
    { label: "Passport", note: "valid ≥ 3 months beyond return, min 2 blank pages, plus copies of all old passports" },
    { label: "Completed & signed Schengen application form" },
    { label: "2 recent photographs", note: "35×45 mm, white background, 80% face, Schengen spec" },
    { label: "Travel medical insurance", note: "min €30,000 cover, valid across the whole Schengen stay" },
    { label: "Confirmed round-trip flight reservation" },
    { label: "Confirmed hotel bookings / day-by-day itinerary", note: "provided by us from your trip" },
    { label: "This cover letter (signed)" },
    { label: "Personal bank statements", note: "last 6 months — must be original and STAMPED & SIGNED by the bank, showing sufficient balance" },
  ];

  let work: ChecklistItem[];
  if (a.funding === "sponsor") {
    work = [
      { label: "Sponsor’s bank statements (6 months)", note: "must be STAMPED & SIGNED by the bank" },
      { label: "Signed sponsorship / affidavit letter from sponsor" },
      { label: "Sponsor’s ITR / income proof" },
      { label: "Proof of relationship with sponsor" },
    ];
  } else if (type === "business" || type === "self") {
    work = [
      { label: "GST registration certificate", note: a.gstNo ? `GST no. ${a.gstNo}` : undefined },
      { label: "Certificate of incorporation / partnership deed / MSME or Shop & Establishment registration" },
      { label: "Company / business bank statements", note: "last 6–12 months — must be STAMPED & SIGNED by the bank" },
      { label: "Business Income Tax Returns (last 2–3 years)" },
      { label: "Personal Income Tax Returns (last 2–3 years)" },
      { label: "Proof of business address / office ownership or rent agreement" },
    ];
  } else if (type === "student") {
    work = [
      { label: "Bonafide / enrolment letter from your institution" },
      { label: "No-objection certificate (NOC) from the institution" },
      { label: "Sponsor’s (parent) ITR + bank statements (bank-stamped) + sponsorship letter" },
    ];
  } else if (type === "retired") {
    work = [
      { label: "Pension statement / retirement proof" },
      { label: "Income Tax Returns (last 2–3 years), if filed" },
    ];
  } else if (type === "homemaker") {
    work = [
      { label: "Spouse’s sponsorship letter + ITR + bank statements (bank-stamped)" },
      { label: "Marriage certificate" },
    ];
  } else {
    work = [
      { label: "Income Tax Returns (last 2–3 years)" },
      { label: "Salary slips (last 3 months)" },
      { label: "Leave-approval / NOC letter from employer, on letterhead" },
    ];
  }

  const ties: ChecklistItem[] = [];
  if (a.investments && a.investments.trim()) ties.push({ label: "Proof of investments / assets", note: a.investments });
  if (a.dependents && a.dependents.trim()) ties.push({ label: "Proof of family staying in India (ties to home)", note: a.dependents });
  if (a.travelHistory && a.travelHistory.trim()) ties.push({ label: "Copies of prior visas / entry-exit stamps", note: a.travelHistory });

  const conditional: ChecklistItem[] = [];
  if (age != null && age < 18) {
    conditional.push({ label: "Birth certificate" });
    conditional.push({ label: "Notarised parental consent + both parents’ passport copies" });
  }
  if ((a.maritalStatus || "").toLowerCase() === "married") {
    conditional.push({ label: "Marriage certificate (recommended, esp. if travelling with spouse)" });
  }

  const groups = [
    { title: "Core documents", items: core },
    { title: a.funding === "sponsor" ? "Sponsor & income" : type === "business" || type === "self" ? "Business & income" : "Income & employment", items: work },
  ];
  if (ties.length) groups.push({ title: "Ties to home (strengthens your case)", items: ties });
  if (conditional.length) groups.push({ title: "Because of your details", items: conditional });
  return groups;
}
