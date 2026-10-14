import { describe, it, expect } from "vitest";
import { schengenCountry, DEFAULT_SCHENGEN, ANY_SCHENGEN } from "./schengen";
import { ageFromDob, travelWindow, visaChecklist, visaCoverLetter, visaFlags, visaLabel, visaRequirementRows } from "./visa";
import { isSchengenDestination, visaTypeForDestination } from "./destinations";

const trip = {
  name: "Malta — Valletta & Gozo",
  destination: "Malta",
  departureDate: new Date("2027-03-01T00:00:00Z"),
  endDate: new Date("2027-03-10T00:00:00Z"),
  itinerary: [{ date: new Date("2027-03-01T00:00:00Z"), location: "Valletta", hotels: [{ hotelName: "Rosselli" }] }],
};

// A file with nothing wrong with it, used as the baseline the other tests bend.
const clean = {
  fullName: "Asha Nair",
  givenName: "Asha",
  surname: "Nair",
  dob: new Date("1986-04-12T00:00:00Z"),
  nationality: "Indian",
  passportNo: "Z1234567",
  passportIssue: new Date("2022-01-10T00:00:00Z"),
  passportExpiry: new Date("2032-01-09T00:00:00Z"),
  income: "₹2,10,000 / month",
  employmentType: "employed",
  funding: "self",
  travelPurpose: "tourism",
  visaType: "schengen",
  visaCountry: "Malta",
  mostNightsCountry: "Malta",
  prevSchengen: "France 2023",
  travelHistory: "UK 2019, Singapore 2022",
};

const NOW = new Date("2026-10-13T00:00:00Z");

describe("schengenCountry", () => {
  it("defaults to Malta when nothing is chosen", () => {
    expect(schengenCountry(null).name).toBe("Malta");
    expect(schengenCountry("").name).toBe("Malta");
    expect(DEFAULT_SCHENGEN.name).toBe("Malta");
  });

  it("matches a name regardless of case or spacing", () => {
    expect(schengenCountry(" iceland ").name).toBe("Iceland");
    expect(schengenCountry("NETHERLANDS").name).toBe("Netherlands");
  });

  it("falls back to Malta for a country that isn't in Schengen", () => {
    expect(schengenCountry("New Zealand").name).toBe("Malta");
  });
});

describe("the letter and checklist follow the country, not Iceland", () => {
  it("addresses a Malta file to Malta", () => {
    const letter = visaCoverLetter(clean, trip);
    expect(letter.salutation).toContain("Malta");
    expect(letter.salutation).not.toContain("Iceland");
  });

  it("keeps Iceland's own figures when Iceland is the country", () => {
    const letter = visaCoverLetter({ ...clean, visaCountry: "Iceland" }, trip);
    expect(letter.salutation).toContain("Iceland");
    const notes = visaRequirementRows({ ...clean, visaCountry: "Iceland" }).map((r) => r.note ?? "").join(" ");
    expect(notes).toContain("8,000 ISK");
    expect(notes).toContain("visa.government.is");
  });

  it("does not invent a daily figure for a country we have none for", () => {
    const notes = visaRequirementRows(clean).map((r) => r.note ?? "").join(" ");
    expect(notes).not.toContain("ISK");
    expect(notes).toContain("confirm the current one");
  });

  it("names the country on the label so two files are never confused", () => {
    expect(visaLabel(clean)).toBe("Schengen · Malta");
    expect(visaLabel({ visaType: "generic", visaCountry: "New Zealand" })).toBe("New Zealand");
  });
});

describe("the checklist adapts to the answers", () => {
  const titles = (a: Parameters<typeof visaChecklist>[0]) => visaChecklist(a).map((g) => g.title);

  it("asks a business traveller for the invitation, and a tourist for nothing extra", () => {
    expect(titles({ ...clean, travelPurpose: "business", hostInvite: "Nexia Ltd" })).toContain("Because this is a business trip");
    expect(titles(clean).some((t) => t.startsWith("Because this is"))).toBe(false);
  });

  it("names the host in the document note when one was given", () => {
    const rows = visaRequirementRows({ ...clean, travelPurpose: "family", hostInvite: "Rohit Mehra, brother, Sliema" });
    expect(rows.find((r) => r.label.includes("Invitation letter"))?.note).toContain("Rohit Mehra");
  });

  it("swaps pay slips for company papers when the applicant owns the business", () => {
    expect(titles({ ...clean, employmentType: "employed" })).toContain("Employment");
    expect(titles({ ...clean, employmentType: "business" })).toContain("Your company");
  });

  it("asks for the sponsor's documents only when someone else is paying", () => {
    expect(titles({ ...clean, funding: "sponsor", sponsorName: "Vikram Nair" })).toContain("Your sponsor");
    expect(titles(clean)).not.toContain("Your sponsor");
  });

  it("adds parental consent for a minor and carries the parents' names through", () => {
    const minor = { ...clean, dob: new Date("2012-05-01T00:00:00Z"), minorParents: "Anil Shah (Z1), Meera Shah (Z2)" };
    const rows = visaRequirementRows(minor);
    expect(rows.some((r) => r.label.includes("parental consent"))).toBe(true);
    expect(rows.find((r) => r.label.includes("parents' passports"))?.note).toContain("Anil Shah");
    expect(visaRequirementRows(clean).some((r) => r.label.includes("parental consent"))).toBe(false);
  });

  it("asks for a year's insurance only when a long-term visa is being requested", () => {
    const note = (a: Parameters<typeof visaRequirementRows>[0]) =>
      visaRequirementRows(a).find((r) => r.label === "Travel medical insurance")?.note ?? "";
    expect(note({ ...clean, wantsLongTerm: true })).toContain("1 YEAR");
    expect(note(clean)).not.toContain("1 YEAR");
  });
});

describe("ageFromDob", () => {
  it("uses the date it is given rather than a date frozen in the source", () => {
    const dob = new Date("2009-01-01T00:00:00Z");
    expect(ageFromDob(dob, new Date("2026-01-01T00:00:00Z"))).toBe(17);
    expect(ageFromDob(dob, new Date("2027-06-01T00:00:00Z"))).toBe(18);
  });

  it("has not had its birthday yet this year", () => {
    expect(ageFromDob(new Date("2000-12-31T00:00:00Z"), new Date("2026-06-30T00:00:00Z"))).toBe(25);
  });
});

describe("visaFlags — the due diligence", () => {
  const texts = (a: Parameters<typeof visaFlags>[0]) => visaFlags(a, trip, NOW).map((f) => f.text).join(" | ");

  it("passes a consistent file", () => {
    expect(visaFlags(clean, trip, NOW)).toEqual([]);
  });

  it("stops a passport that expires less than three months after the return", () => {
    const f = visaFlags({ ...clean, passportExpiry: new Date("2027-04-15T00:00:00Z") }, trip, NOW);
    expect(f.some((x) => x.level === "stop" && x.text.includes("Passport expires"))).toBe(true);
    // one day the other side of the line is fine
    expect(visaFlags({ ...clean, passportExpiry: new Date("2027-06-11T00:00:00Z") }, trip, NOW)).toEqual([]);
  });

  it("stops a passport older than ten years", () => {
    const f = visaFlags({ ...clean, passportIssue: new Date("2014-01-01T00:00:00Z") }, trip, NOW);
    expect(f.some((x) => x.level === "stop" && x.text.includes("10 years"))).toBe(true);
  });

  it("stops a file aimed at the wrong member state", () => {
    const f = visaFlags({ ...clean, visaCountry: "Malta", mostNightsCountry: "Italy" }, trip, NOW);
    const wrong = f.find((x) => x.text.includes("most nights"));
    expect(wrong?.level).toBe("stop");
    expect(wrong?.text).toContain("Italy");
  });

  it("asks where the nights are when it wasn't told", () => {
    expect(texts({ ...clean, mostNightsCountry: null })).toContain("right consulate");
  });

  it("notices a sponsor who was never named, and a host who wasn't either", () => {
    expect(texts({ ...clean, funding: "sponsor" })).toContain("hasn't named them");
    expect(texts({ ...clean, travelPurpose: "business" })).toContain("no host named");
  });

  it("notices a minor with no parent details", () => {
    expect(texts({ ...clean, dob: new Date("2012-05-01T00:00:00Z") })).toContain("minor");
  });

  it("warns that a long-term visa on a first application rarely lands", () => {
    expect(texts({ ...clean, prevSchengen: null, wantsLongTerm: true })).toContain("rarely granted");
  });

  it("says so when the trip has no dates to apply against", () => {
    expect(texts({ ...clean })).not.toContain("no fixed dates");
    const undated = { ...trip, departureDate: null, endDate: null };
    expect(visaFlags(clean, undated, NOW).some((f) => f.text.includes("no fixed dates"))).toBe(true);
  });
});

describe("an enquiry with no trip", () => {
  // Someone who filled the agency's permanent link: they named their own
  // country and their own dates, and there is no trip behind them at all.
  const enquiry = {
    ...clean,
    visaCountry: "Malta",
    mostNightsCountry: "Malta",
    travelFrom: new Date("2027-03-01T00:00:00Z"),
    travelTo: new Date("2027-03-10T00:00:00Z"),
    residenceCountry: "India",
  };

  it("builds the letter from the traveller's own dates", () => {
    const letter = visaCoverLetter(enquiry, null);
    const para = letter.paragraphs.join(" ");
    expect(para).toContain("1 March 2027");
    expect(para).toContain("10 March 2027");
    expect(para).toContain("(9 days)");
    expect(letter.itinerary).toEqual([]);
  });

  it("does not claim a tour it knows nothing about", () => {
    const para = visaCoverLetter(enquiry, null).paragraphs.join(" ");
    expect(para).not.toContain("as part of the tour");
    expect(para).toContain("enclosed with this application");
  });

  it("still names the trip when there is one", () => {
    expect(visaCoverLetter(enquiry, trip).paragraphs.join(" ")).toContain("as part of the tour");
  });

  it("checks the passport against the dates the traveller gave", () => {
    const short = { ...enquiry, passportExpiry: new Date("2027-04-15T00:00:00Z") };
    expect(visaFlags(short, null, NOW).some((f) => f.level === "stop" && f.text.includes("Passport expires"))).toBe(true);
    expect(visaFlags(enquiry, null, NOW)).toEqual([]);
  });

  it("asks for dates when the traveller gave none", () => {
    const undated = { ...enquiry, travelFrom: null, travelTo: null };
    expect(visaFlags(undated, null, NOW).some((f) => f.text === "No travel dates given, and the application needs them.")).toBe(true);
  });

  it("prefers the trip's dates over the traveller's guess once there is a trip", () => {
    const w = travelWindow({ ...enquiry, travelFrom: new Date("2030-01-01T00:00:00Z") }, trip);
    expect(w.from?.toISOString().slice(0, 10)).toBe("2027-03-01");
    expect(w.tripName).toBe(trip.name);
  });
});

describe("the destination decides the template", () => {
  it("treats a Schengen state as Schengen and anywhere else as a visitor visa", () => {
    expect(visaTypeForDestination("Malta")).toBe("schengen");
    expect(visaTypeForDestination("italy")).toBe("schengen");
    expect(visaTypeForDestination("Japan")).toBe("generic");
    expect(visaTypeForDestination("United Kingdom")).toBe("generic");
    expect(visaTypeForDestination(null)).toBe("generic");
  });

  it("knows Ireland and Cyprus are in the EU but not in Schengen", () => {
    expect(isSchengenDestination("Ireland")).toBe(false);
    expect(isSchengenDestination("Cyprus")).toBe(false);
  });

  it("includes the states that joined most recently", () => {
    for (const c of ["Bulgaria", "Romania", "Croatia", "Liechtenstein"]) {
      expect(isSchengenDestination(c)).toBe(true);
    }
  });
});

describe("any Schengen, and who sees what", () => {
  const open = { ...clean, visaCountry: ANY_SCHENGEN, mostNightsCountry: "" };

  it("leaves the country open rather than quietly picking one", () => {
    expect(visaLabel(open)).toBe("Schengen · country not set");
    expect(visaCoverLetter(open, trip).salutation).not.toMatch(/Malta|Iceland|Embassy of [A-Z]/);
    expect(visaChecklist(open).some((g) => g.title === "Which country to apply to — still open")).toBe(true);
  });

  it("lets the nights decide, which is what the rule says anyway", () => {
    const withNights = { ...open, mostNightsCountry: "Italy" };
    expect(visaLabel(withNights)).toBe("Schengen · Italy (by nights)");
    expect(visaCoverLetter(withNights, trip).salutation).toContain("Italy");
    expect(visaChecklist(withNights).some((g) => g.title === "Applying to Italy")).toBe(true);
  });

  it("does not accuse an undecided traveller of picking the wrong country", () => {
    const withNights = { ...open, mostNightsCountry: "Italy" };
    expect(visaFlags(withNights, trip, NOW)).toEqual([]);
  });

  it("stops a file that has neither a country nor any nights", () => {
    expect(visaFlags(open, trip, NOW).some((f) => f.level === "stop" && f.text.includes("no consulate"))).toBe(true);
  });

  it("still builds the full document list while the country is open", () => {
    expect(visaRequirementRows(open).length).toBeGreaterThan(15);
  });
});

describe("the traveller's copy holds back the agency's work", () => {
  const titles = (aud: "agent" | "traveller") => visaChecklist(clean, aud).map((g) => g.title);
  const labels = (aud: "agent" | "traveller") =>
    visaChecklist(clean, aud).flatMap((g) => g.items.map((i) => i.label));

  it("drops the which-country-and-why section", () => {
    expect(titles("agent")).toContain("Applying to Malta");
    expect(titles("traveller")).not.toContain("Applying to Malta");
    expect(titles("traveller").some((t) => t.startsWith("Which country"))).toBe(false);
  });

  it("moves what the agency produces into its own closing block", () => {
    const agency = ["Travel medical insurance", "Round-trip flight reservation", "Cover letter"];
    for (const l of agency) {
      expect(labels("agent")).toContain(l);
      expect(labels("traveller")).toContain(l); // still visible…
    }
    const closing = visaChecklist(clean, "traveller").at(-1)!;
    expect(closing.title).toBe("We take care of these for you");
    for (const l of agency) expect(closing.items.map((i) => i.label)).toContain(l);
    // …and with no instructions attached
    expect(closing.items.every((i) => !i.note)).toBe(true);
  });

  it("still asks the traveller for their own documents", () => {
    for (const l of ["Passport", "Personal bank statement — last 3 years"]) {
      expect(labels("traveller")).toContain(l);
    }
  });

  it("does not send the traveller off to a consulate page to look things up", () => {
    const notes = visaChecklist(clean, "traveller").flatMap((g) => g.items.map((i) => i.note ?? "")).join(" ");
    expect(notes).not.toMatch(/VFS|consulate|portal|visa\.government\.is/i);
    expect(notes).toContain("we'll tell you the figure");
  });

  it("leaves the agency's own view untouched", () => {
    const notes = visaChecklist(clean, "agent").flatMap((g) => g.items.map((i) => i.note ?? "")).join(" ");
    expect(notes).toMatch(/VFS|consulate/i);
  });
});

describe("the agency's own document standard", () => {
  const labels = (a: Parameters<typeof visaChecklist>[0]) =>
    visaChecklist(a).flatMap((g) => g.items.map((i) => i.label));

  it("asks three years of personal financials, not three months", () => {
    const ls = labels(clean);
    expect(ls).toContain("Personal bank statement — last 3 years");
    expect(ls).toContain("Income Tax Return (ITR) acknowledgment — last 3 years");
    expect(ls.join(" ")).not.toContain("last 2 assessment years");
  });

  it("asks a company for its incorporation and GST certificates and three years of books", () => {
    const ls = labels({ ...clean, employmentType: "business", gstNo: "08AACCR1234K1Z2" });
    for (const l of [
      "Certificate of incorporation",
      "GST certificate",
      "Company bank statement — last 3 years",
      "Company Income Tax Returns — last 3 years",
    ]) expect(ls).toContain(l);
  });

  it("puts the GST number on the certificate line when it was given", () => {
    const rows = visaRequirementRows({ ...clean, employmentType: "business", gstNo: "08AACCR1234K1Z2" });
    expect(rows.find((r) => r.label === "GST certificate")?.note).toContain("08AACCR1234K1Z2");
  });

  it("asks a salaried applicant for none of the company papers", () => {
    expect(labels(clean)).not.toContain("Certificate of incorporation");
  });
});

describe("a sponsored business owner", () => {
  // The case that used to lose documents: the sponsor section replaced the
  // company section outright, so a director whose company paid was never asked
  // for the certificate of incorporation.
  const director = { ...clean, employmentType: "business", funding: "sponsor", sponsorName: "Mediterranean Yield Partners Ltd" };
  const titles = visaChecklist(director).map((g) => g.title);
  const labels = visaChecklist(director).flatMap((g) => g.items.map((i) => i.label));

  it("is asked for both the sponsor's papers and the company's", () => {
    expect(titles).toContain("Your sponsor");
    expect(titles).toContain("Your company");
    expect(labels).toContain("Certificate of incorporation");
    expect(labels).toContain("Sponsor's personal bank statement — last 3 years");
  });

  it("is not also asked for pay slips", () => {
    expect(labels).not.toContain("Pay slips for the last 3 months");
  });
});

describe("background: refusals, bans, convictions", () => {
  const texts = (a: Parameters<typeof visaFlags>[0]) => visaFlags(a, trip, NOW).map((f) => `${f.level}:${f.text}`).join(" | ");
  const labels = (a: Parameters<typeof visaChecklist>[0]) => visaChecklist(a).flatMap((g) => g.items.map((i) => i.label));

  it("says nothing when nothing is declared", () => {
    expect(texts(clean)).not.toMatch(/refusal|overstay|criminal/i);
  });

  it("treats a declared refusal as work to do, and asks for the letter", () => {
    const a = { ...clean, visaRefusals: "UK, 2021 — insufficient funds" };
    expect(texts(a)).toContain("check:Declared a previous visa refusal");
    expect(labels(a)).toContain("Copy of the previous refusal letter");
    expect(labels(a)).toContain("A written explanation of what has changed since the refusal");
  });

  it("stops the file on a declared overstay or ban", () => {
    const a = { ...clean, entryIssues: "overstayed 11 days in Dubai, 2019" };
    expect(texts(a)).toContain("stop:Declared an overstay");
    expect(labels(a)).toContain("Papers showing how the earlier entry matter was closed");
  });

  it("flags a declared conviction without treating it as fatal", () => {
    const a = { ...clean, criminalRecord: "traffic case, Pune, 2017 — closed" };
    expect(texts(a)).toContain("check:Declared a criminal matter");
    expect(labels(a)).toContain("Court order / case papers, and a police clearance certificate if asked");
  });

  it("no longer complains about passport details the form stopped asking for", () => {
    const { passportNo, passportExpiry, dob, ...bare } = clean;
    void passportNo; void passportExpiry; void dob;
    const t = texts(bare);
    expect(t).not.toMatch(/No passport number|No passport expiry|No date of birth/);
  });

  it("still catches a passport that is wrong once the details are in", () => {
    const a = { ...clean, passportExpiry: new Date("2027-04-15T00:00:00Z") };
    expect(texts(a)).toContain("stop:Passport expires");
  });
});

describe("the sponsor's own file", () => {
  const base = { ...clean, funding: "sponsor", sponsorName: "Vikram Nair", sponsorRelation: "father" };
  const titles = (a: Parameters<typeof visaChecklist>[0]) => visaChecklist(a).map((g) => g.title);
  const labels = (a: Parameters<typeof visaChecklist>[0]) => visaChecklist(a).flatMap((g) => g.items.map((i) => i.label));

  it("asks the sponsor for three years of statements and returns, like the applicant", () => {
    expect(labels(base)).toContain("Sponsor's personal bank statement — last 3 years");
    expect(labels(base)).toContain("Sponsor's Income Tax Returns — last 3 years");
  });

  it("names the sponsor on the letter they have to sign", () => {
    const rows = visaRequirementRows(base);
    expect(rows.find((r) => r.label === "Signed sponsorship letter")?.note).toContain("Vikram Nair (your father)");
  });

  it("asks a sponsoring company for its own papers", () => {
    const a = { ...base, sponsorWork: "business", sponsorEmployer: "Nair Textiles Pvt Ltd", sponsorGst: "27AAB1234C1ZQ" };
    expect(titles(a)).toContain("Your sponsor's company");
    const rows = visaRequirementRows(a);
    expect(rows.find((r) => r.label === "Certificate of incorporation" && r.group === "Your sponsor's company")?.note).toContain("Nair Textiles");
    expect(rows.find((r) => r.label === "GST certificate" && r.group === "Your sponsor's company")?.note).toContain("27AAB1234C1ZQ");
  });

  it("asks a salaried sponsor for pay slips instead", () => {
    const a = { ...base, sponsorWork: "employed" };
    expect(labels(a)).toContain("Sponsor's pay slips — last 3 months");
    expect(titles(a)).not.toContain("Your sponsor's company");
  });

  it("asks for the marriage certificate only when the sponsor is the spouse", () => {
    expect(labels({ ...base, sponsorRelation: "wife" })).toContain("Marriage certificate");
    expect(labels(base)).not.toContain("Marriage certificate");
  });

  it("says so when we don't know what the sponsor does or earns", () => {
    const t = visaFlags(base, trip, NOW).map((f) => f.text).join(" | ");
    expect(t).toContain("Don't know what Vikram Nair does");
    expect(t).toContain("what the sponsor earns");
  });
});
