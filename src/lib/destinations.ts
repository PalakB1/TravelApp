import { SCHENGEN_COUNTRIES, isAnySchengen } from "./schengen";

// Where a traveller can say they want to go, on the agency's own visa link.
//
// The whole point of that link is that nobody has decided anything yet: there is
// no trip, no itinerary, no agent-chosen visa type. So the traveller names the
// country, and the country decides the rest — pick a Schengen state and the file
// is built to Schengen rules, pick anywhere else and it uses the general
// visitor-visa template.
//
// The list below is the destinations Indian travellers actually ask about, not
// every country on earth. "Somewhere else" is always available at the end, and
// types in freely, so nothing is shut out by an omission here.

export const OTHER_DESTINATIONS: string[] = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
  "Japan",
  "South Korea",
  "Singapore",
  "Thailand",
  "Vietnam",
  "Indonesia (Bali)",
  "Malaysia",
  "Philippines",
  "China",
  "Hong Kong",
  "Taiwan",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Bahrain",
  "Turkey",
  "Georgia",
  "Azerbaijan",
  "Armenia",
  "Israel",
  "Jordan",
  "Egypt",
  "Morocco",
  "Kenya",
  "Tanzania",
  "South Africa",
  "Mauritius",
  "Seychelles",
  "Maldives",
  "Sri Lanka",
  "Nepal",
  "Bhutan",
  "Cyprus",
  "Serbia",
  "Albania",
  "Russia",
  "Kazakhstan",
  "Uzbekistan",
  "Brazil",
  "Argentina",
  "Mexico",
  "Fiji",
];

/** The value the dropdown uses for "not on this list". */
export const OTHER_OPTION = "__other__";

export function isSchengenDestination(name: string | null | undefined): boolean {
  if (isAnySchengen(name)) return true; // "somewhere in Europe, not decided yet"
  const n = (name ?? "").trim().toLowerCase();
  return SCHENGEN_COUNTRIES.some((c) => c.name.toLowerCase() === n);
}

/** Schengen or not — which template a destination should be built with. */
export function visaTypeForDestination(name: string | null | undefined): "schengen" | "generic" {
  return isSchengenDestination(name) ? "schengen" : "generic";
}
