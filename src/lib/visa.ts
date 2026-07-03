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
  occupation?: string | null;
  employer?: string | null;
  employerAddress?: string | null;
  income?: string | null;
  funding?: string | null;
  sponsorName?: string | null;
  sponsorRelation?: string | null;
  prevSchengen?: string | null;
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
  const fundingLine =
    a.funding === "sponsor" && a.sponsorName
      ? `The trip is being sponsored by ${a.sponsorName}${a.sponsorRelation ? ` (my ${a.sponsorRelation})` : ""}, whose financial documents are enclosed.`
      : `I am financing this trip myself, and my bank statements and income proof are enclosed.`;
  const workLine =
    a.employer
      ? `I am employed as ${a.occupation || "an employee"} at ${a.employer}${a.employerAddress ? `, ${a.employerAddress}` : ""}${a.income ? `, with an income of ${a.income}` : ""}.`
      : `I work as ${a.occupation || "____________"}${a.income ? `, with an income of ${a.income}` : ""}.`;

  const paragraphs = [
    `I, ${a.fullName}, holder of passport number ${a.passportNo || "____________"} (issued at ${a.passportPlace || "____________"} on ${d(a.passportIssue)}, valid until ${d(a.passportExpiry)}), a citizen of ${a.nationality || "India"}, born on ${d(a.dob)} at ${a.placeOfBirth || "____________"}, residing at ${[a.address, a.city, a.pin].filter(Boolean).join(", ") || "____________"}, respectfully apply for a short-stay Schengen tourist visa to visit ${dest}.`,
    `I intend to travel from ${d(t.departureDate)} to ${d(t.endDate)}${days ? ` (${days} days)` : ""} as part of a self-drive group tour, “${t.name}”. My day-by-day itinerary and confirmed accommodation are listed below.`,
    `${workLine} ${fundingLine}`,
    `I have strong personal and professional ties to my home country and I fully intend to return before the expiry of my visa. ${a.prevSchengen && a.prevSchengen.toLowerCase() !== "no" ? `I have previously travelled to the Schengen area (${a.prevSchengen}).` : "This is my first application for a Schengen visa."}`,
    `The required supporting documents are enclosed with this application. I kindly request you to grant me the visa. Thank you for your consideration.`,
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
  const core: ChecklistItem[] = [
    { label: "Passport", note: "valid ≥ 3 months beyond return, min 2 blank pages, plus copies of old passports" },
    { label: "Completed & signed Schengen application form" },
    { label: "2 recent photographs", note: "35×45 mm, white background, 80% face, Schengen spec" },
    { label: "Travel medical insurance", note: "min €30,000 cover, valid across the whole Schengen stay" },
    { label: "Confirmed round-trip flight reservation" },
    { label: "Confirmed hotel bookings / day-by-day itinerary", note: "provided by us from your trip" },
    { label: "This cover letter (signed)" },
    { label: "Bank statements", note: "last 6 months, bank-stamped" },
  ];
  const work: ChecklistItem[] = a.funding === "sponsor"
    ? [
        { label: "Sponsor’s bank statements (6 months) + sponsorship letter" },
        { label: "Proof of relationship with sponsor" },
        { label: "Your income proof (ITR / salary slips) if employed" },
      ]
    : (a.occupation || "").toLowerCase().includes("student")
    ? [{ label: "Bonafide / enrolment letter from your institution" }, { label: "No-objection certificate from the institution" }]
    : a.employer
    ? [{ label: "Income Tax Returns (last 2–3 years)" }, { label: "Salary slips (last 3 months)" }, { label: "Leave-approval / NOC letter from employer" }]
    : [{ label: "Business registration / GST certificate" }, { label: "Income Tax Returns (last 2–3 years)" }, { label: "Company bank statements" }];

  const conditional: ChecklistItem[] = [];
  if (age != null && age < 18) {
    conditional.push({ label: "Birth certificate" });
    conditional.push({ label: "Notarised parental consent + both parents’ passport copies" });
  }
  if (a.maritalStatus && a.maritalStatus.toLowerCase() === "married") {
    conditional.push({ label: "Marriage certificate (recommended if travelling with spouse)" });
  }

  const groups = [
    { title: "Core documents", items: core },
    { title: a.funding === "sponsor" ? "Sponsor & income" : "Income & employment", items: work },
  ];
  if (conditional.length) groups.push({ title: "Because of your details", items: conditional });
  return groups;
}
