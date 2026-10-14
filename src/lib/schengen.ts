// Which Schengen country you're applying to, and what that changes.
//
// The checklist used to be written for Iceland — its portal, its krónur
// subsistence figures, its embassy on the salutation line. That is wrong on a
// Malta application, and wrong in a way an applicant can't spot.
//
// A WORD OF CAUTION, kept here deliberately: consulates change their required
// documents and their daily-funds figures without much notice, and several
// states have no consulate in India at all — the application goes to another
// member state or to VFS acting for them. Everything below is a starting point
// to work from, not a source of truth. Check the current VFS/consulate list for
// the country and the city you're applying in before you send anything off.

export type SchengenCountry = {
  code: string;
  name: string;
  /** Who the cover letter is addressed to, with no leading article. */
  consulate: string;
  /** Subsistence the consulate expects to see, per day. Left blank where we
   *  don't have a figure we'd stand behind — better empty than invented. */
  dailyFunds?: string;
  /** Where the online form lives, when the country runs its own. */
  portal?: string;
};

export const SCHENGEN_COUNTRIES: SchengenCountry[] = [
  { code: "MT", name: "Malta", consulate: "Embassy of Malta / VFS Global" },
  { code: "AT", name: "Austria", consulate: "Embassy of Austria / VFS Global" },
  { code: "BE", name: "Belgium", consulate: "Embassy of Belgium / VFS Global" },
  { code: "BG", name: "Bulgaria", consulate: "Embassy of Bulgaria / VFS Global" },
  { code: "HR", name: "Croatia", consulate: "Embassy of Croatia / VFS Global" },
  { code: "CZ", name: "Czechia", consulate: "Embassy of Czechia / VFS Global" },
  { code: "DK", name: "Denmark", consulate: "Embassy of Denmark / VFS Global" },
  { code: "EE", name: "Estonia", consulate: "Embassy of Estonia / VFS Global" },
  { code: "FI", name: "Finland", consulate: "Embassy of Finland / VFS Global" },
  { code: "FR", name: "France", consulate: "Consulate of France / VFS Global" },
  { code: "DE", name: "Germany", consulate: "Embassy of Germany / VFS Global" },
  { code: "GR", name: "Greece", consulate: "Embassy of Greece / VFS Global" },
  { code: "HU", name: "Hungary", consulate: "Embassy of Hungary / VFS Global" },
  { code: "IS", name: "Iceland", consulate: "Embassy of Iceland / VFS Global",
    dailyFunds: "≥ 8,000 ISK/day (≈ €58), or 4,000 ISK/day where a third party bears your expenses",
    portal: "visa.government.is" },
  { code: "IT", name: "Italy", consulate: "Consulate of Italy / VFS Global" },
  { code: "LV", name: "Latvia", consulate: "Embassy of Latvia / VFS Global" },
  { code: "LI", name: "Liechtenstein", consulate: "Embassy of Switzerland / VFS Global (which represents Liechtenstein)" },
  { code: "LT", name: "Lithuania", consulate: "Embassy of Lithuania / VFS Global" },
  { code: "LU", name: "Luxembourg", consulate: "Embassy of Luxembourg / VFS Global" },
  { code: "NL", name: "Netherlands", consulate: "Embassy of the Netherlands / VFS Global" },
  { code: "NO", name: "Norway", consulate: "Embassy of Norway / VFS Global" },
  { code: "PL", name: "Poland", consulate: "Embassy of Poland / VFS Global" },
  { code: "PT", name: "Portugal", consulate: "Embassy of Portugal / VFS Global" },
  { code: "RO", name: "Romania", consulate: "Embassy of Romania / VFS Global" },
  { code: "SK", name: "Slovakia", consulate: "Embassy of Slovakia / VFS Global" },
  { code: "SI", name: "Slovenia", consulate: "Embassy of Slovenia / VFS Global" },
  { code: "ES", name: "Spain", consulate: "Consulate of Spain / BLS International" },
  { code: "SE", name: "Sweden", consulate: "Embassy of Sweden / VFS Global" },
  { code: "CH", name: "Switzerland", consulate: "Embassy of Switzerland / VFS Global" },
];

export const DEFAULT_SCHENGEN = SCHENGEN_COUNTRIES[0]; // Malta

// "I need a Schengen visa, I don't know which country yet."
//
// A common and perfectly reasonable answer — most travellers have no idea that
// a Schengen application belongs to one particular member state, and plenty of
// corporate groups genuinely haven't fixed the route yet. Rather than make them
// guess, the form takes this and then asks where they'll spend the most nights,
// which is what decides the consulate anyway. Until that is answered the file
// has no country, and says so instead of quietly defaulting to one.
export const ANY_SCHENGEN = "__any_schengen__";

export const isAnySchengen = (name: string | null | undefined) => (name ?? "").trim() === ANY_SCHENGEN;

/** The member state a file goes to, or null while that is genuinely undecided. */
export function fileCountry(a: { visaCountry?: string | null; mostNightsCountry?: string | null }): SchengenCountry | null {
  if (isAnySchengen(a.visaCountry)) {
    const nights = (a.mostNightsCountry ?? "").trim();
    return nights ? schengenCountry(nights) : null;
  }
  return schengenCountry(a.visaCountry);
}

export function schengenCountry(name: string | null | undefined): SchengenCountry {
  const n = (name ?? "").trim().toLowerCase();
  return SCHENGEN_COUNTRIES.find((c) => c.name.toLowerCase() === n) ?? DEFAULT_SCHENGEN;
}
