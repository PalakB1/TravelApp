"use client";

import { useActionState, useState } from "react";
import { submitVisaApplicant, type VisaResult } from "@/app/visa/actions";
import { SCHENGEN_COUNTRIES, DEFAULT_SCHENGEN, ANY_SCHENGEN, isAnySchengen } from "@/lib/schengen";
import { OTHER_DESTINATIONS, OTHER_OPTION, isSchengenDestination } from "@/lib/destinations";
import { visaChecklist } from "@/lib/visa";
import CountriesVisited from "./CountriesVisited";

// The form only asks what it needs to.
//
// Every embassy question hangs off an earlier answer: a salaried applicant is
// never asked for a GST number, and a self-funded one is never asked who their
// sponsor is. Thirty fields shown at once is how a traveller fills six of them
// wrong; a dozen that follow from each other is how they fill them right.
//
// It asks for nothing a passport copy can answer — no date of birth, no
// passport number, no address — because that is two chances to mistype the same
// fact.
//
// It runs in two modes. Against a TRIP, the agency has already chosen the
// destination and the dates come from the trip. On the agency's own permanent
// link there is no trip: the traveller names the country and the dates, and the
// country decides everything after that — a Schengen state gets the Schengen
// questions, anywhere else gets the general ones.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div className="small" style={{ fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

// A question that appeared because of what was answered above it.
function Follow({ why, children }: { why: string; children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 12, margin: "0 0 12px" }}>
      <p className="small muted" style={{ margin: "0 0 8px" }}>{why}</p>
      {children}
    </div>
  );
}

export default function VisaForm({
  tripId,
  orgId,
  visaType = "schengen",
  visaCountry = "",
}: {
  tripId?: string;
  orgId?: string;
  visaType?: string;
  /** On a trip link: the country the agency chose. On the agency link: a
   *  pre-selected destination, when the link carries one. */
  visaCountry?: string;
}) {
  const [state, action, pending] = useActionState<VisaResult | undefined, FormData>(submitVisaApplicant, undefined);
  const intake = !tripId && !!orgId;

  // The answers other questions depend on.
  const preset = SCHENGEN_COUNTRIES.find((c) => c.name.toLowerCase() === visaCountry.trim().toLowerCase());
  // A link may carry ?country=…; anything the dropdown doesn't offer would leave
  // the select showing nothing at all, so it falls back to the default.
  const presetIntake =
    isAnySchengen(visaCountry) ? ANY_SCHENGEN
    : preset ? preset.name
    : OTHER_DESTINATIONS.find((c) => c.toLowerCase() === visaCountry.trim().toLowerCase()) ?? ANY_SCHENGEN;
  const [country, setCountry] = useState(
    intake ? presetIntake : (preset ?? DEFAULT_SCHENGEN).name,
  );
  const [otherCountry, setOtherCountry] = useState("");
  const [mostNights, setMostNights] = useState("");
  const [purpose, setPurpose] = useState("tourism");
  const [work, setWork] = useState("employed");
  const [funding, setFunding] = useState("self");
  const [prevVisa, setPrevVisa] = useState("");
  const [refused, setRefused] = useState("no");
  const [entryIssue, setEntryIssue] = useState("no");
  const [sponsorWork, setSponsorWork] = useState("");
  const [age, setAge] = useState("");

  // On a trip link the agency fixed the visa type. On the agency link the
  // destination decides it, which is why the rest of the form can change the
  // moment a country is picked.
  const schengen = intake ? isSchengenDestination(country) : visaType === "schengen";
  const chosen = country === OTHER_OPTION ? otherCountry.trim() : country;

  const hasPrevVisa = prevVisa.trim() !== "" && prevVisa.trim().toLowerCase() !== "no";
  const owner = work === "business" || work === "self";
  const salaried = work === "employed" || work === "other";
  const sponsored = funding === "sponsor";
  // The application belongs to the country you sleep in most. Saying so here
  // saves a rejected file later.
  // Only someone who named a country can have named the wrong one — if they left
  // it open, the nights decide and there is nothing to warn about.
  const anySchengen = isAnySchengen(country);
  const ageNum = age === "" ? null : Number(age);
  const minor = ageNum != null && Number.isFinite(ageNum) && ageNum > 0 && ageNum < 18;
  const wrongCountry = schengen && !anySchengen && mostNights !== "" && mostNights !== country;

  // The document list, built from the answers already on screen and rebuilt on
  // every change — the same function the agency's desk uses, so what the
  // traveller ticks here is exactly what will be asked of them. The agency's own
  // items are left out: there is nothing for the traveller to confirm about work
  // somebody else is doing.
  const draft = {
    fullName: "",
    visaType: schengen ? "schengen" : "generic",
    visaCountry: country === OTHER_OPTION ? otherCountry : country,
    mostNightsCountry: mostNights || null,
    travelPurpose: purpose,
    employmentType: work,
    funding,
    sponsorWork: sponsorWork || null,
    age: ageNum,
    prevSchengen: prevVisa || null,
  };
  const docGroups = visaChecklist(draft, "traveller").filter((g) => g.title !== "We take care of these for you");

  if (state?.ok) {
    return (
      <div className="empty-cta" style={{ borderColor: "var(--success)", marginTop: 18 }}>
        <span className="emoji">✅</span>
        <div className="t">Details submitted</div>
        <div className="d">{state.message}</div>
      </div>
    );
  }

  return (
    <form action={action}>
      {tripId && <input type="hidden" name="tripId" value={tripId} />}
      {orgId && <input type="hidden" name="orgId" value={orgId} />}
      {tripId && <input type="hidden" name="visaType" value={visaType} />}
      {tripId && !schengen && <input type="hidden" name="visaCountry" value={visaCountry} />}

      {intake && (
        <Section title="Where you want to go">
          <div className="row">
            <label className="field"><span className="lbl">Which country are you travelling to?</span>
              <select name="visaCountry" value={country} onChange={(e) => setCountry(e.target.value)} required>
                <optgroup label="Europe">
                  <option value={ANY_SCHENGEN}>Any Schengen country (Europe)</option>
                </optgroup>
                <optgroup label="A specific Schengen country">
                  {SCHENGEN_COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                </optgroup>
                <optgroup label="Everywhere else">
                  {OTHER_DESTINATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <option value={OTHER_OPTION}>Somewhere else — I&apos;ll type it</option>
              </select>
            </label>
            <label className="field"><span className="lbl">Which country do you live in?</span>
              <input name="residenceCountry" defaultValue="India" />
            </label>
          </div>
          {country === OTHER_OPTION && (
            <label className="field" style={{ maxWidth: 320 }}><span className="lbl">Country you&apos;re travelling to</span>
              <input name="visaCountryOther" value={otherCountry} onChange={(e) => setOtherCountry(e.target.value)} placeholder="Type the country" required />
            </label>
          )}
          <div className="row">
            <label className="field"><span className="lbl">Travelling from (approx.)</span><input name="travelFrom" type="date" /></label>
            <label className="field"><span className="lbl">Coming back (approx.)</span><input name="travelTo" type="date" /></label>
          </div>
          <p className="small muted" style={{ margin: "-4px 0 12px" }}>
            Approximate dates are fine — we only need them to check your passport is valid long enough.
          </p>

          {schengen && (
            <Follow why={anySchengen
              ? "A Schengen visa covers all 29 countries, but the application itself has to go to one of them — the one where you'll spend the most nights. Tell us that and we'll handle the rest."
              : `${chosen} is in the Schengen area. A Schengen visa lets you travel the whole area, but the application must go to the country where you spend the most nights — so we need to know that too.`}>
              <label className="field" style={{ maxWidth: 320 }}><span className="lbl">Which country will you spend the most nights in?</span>
                <select name="mostNightsCountry" value={mostNights} onChange={(e) => setMostNights(e.target.value)}>
                  <option value="">Select…</option>
                  {SCHENGEN_COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
              </label>
              {mostNights === "" && (
                <label className="field" style={{ maxWidth: 320 }}><span className="lbl">And which country do you land in first?</span>
                  <select name="entryCountry" defaultValue="">
                    <option value="">Select…</option>
                    {SCHENGEN_COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                  </select>
                </label>
              )}
            </Follow>
          )}
          {wrongCountry && (
            <div className="small" style={{ background: "var(--accent-bg)", border: "1px solid var(--warning)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
              You&apos;re going to <b>{country}</b> but spending most nights in <b>{mostNights}</b>. The application
              normally has to go to <b>{mostNights}</b>, not {country} — we&apos;ll confirm this with you.
            </div>
          )}
        </Section>
      )}

      {!intake && schengen && (
        <Section title="Where you are applying">
          <div className="row">
            <label className="field"><span className="lbl">Which country are you applying to?</span>
              <select name="visaCountry" value={country} onChange={(e) => setCountry(e.target.value)}>
                {SCHENGEN_COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label className="field"><span className="lbl">Which country will you spend the most nights in?</span>
              <select name="mostNightsCountry" value={mostNights} onChange={(e) => setMostNights(e.target.value)}>
                <option value="">Select…</option>
                {SCHENGEN_COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <p className="small muted" style={{ margin: "-4px 0 12px" }}>
            A Schengen visa lets you travel the whole area, but you must apply to the country where you spend the
            most nights — so we ask both.
          </p>
          {wrongCountry && (
            <div className="small" style={{ background: "var(--accent-bg)", border: "1px solid var(--warning)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
              You&apos;ve chosen to apply to <b>{country}</b> but most of your nights are in <b>{mostNights}</b>. The
              application normally has to go to <b>{mostNights}</b> — <b>{country}</b> can refuse to take it. Change the
              country above, or tell us why {country} is right in the last box of this form.
            </div>
          )}
          {mostNights === "" && (
            <Follow why="If your nights are split evenly between countries, the application goes to whichever one you land in first.">
              <label className="field" style={{ maxWidth: 280 }}><span className="lbl">Which country do you land in first?</span>
                <select name="entryCountry" defaultValue="">
                  <option value="">Select…</option>
                  {SCHENGEN_COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
              </label>
            </Follow>
          )}
        </Section>
      )}

      <Section title="Why you are travelling">
        <label className="field" style={{ maxWidth: 280 }}><span className="lbl">Purpose of the trip</span>
          <select name="travelPurpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="tourism">Tourism / holiday</option>
            <option value="business">Business</option>
            <option value="family">Visiting family or friends</option>
          </select>
        </label>
        {purpose === "business" && (
          <Follow why="A business trip needs an invitation from the company you are visiting, on their letterhead, stating the dates and who pays for what.">
            <label className="field"><span className="lbl">Company inviting you — name &amp; city</span><input name="hostInvite" placeholder="e.g. Nexia Services Ltd, Valletta" /></label>
          </Follow>
        )}
        {purpose === "family" && (
          <Follow why="Your host has to invite you in writing and show they live there legally — we'll need their name to prepare the letter.">
            <label className="field"><span className="lbl">Who you are visiting — name, relationship &amp; city</span><input name="hostInvite" placeholder="e.g. Rohit Mehra, my brother, Sliema" /></label>
          </Follow>
        )}
      </Section>

      <Section title="You">
        <div className="row">
          <label className="field"><span className="lbl">Given name(s) / first name</span><input name="givenName" placeholder="As printed on your passport" required /></label>
          <label className="field"><span className="lbl">Surname / last name</span><input name="surname" placeholder="As printed on your passport" /></label>
        </div>
        <div className="row-3">
          <label className="field"><span className="lbl">Your age</span>
            <input name="age" type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="years" required />
          </label>
          <label className="field"><span className="lbl">Phone (with country code)</span><input name="phone" placeholder="+91 98765 43210" required /></label>
          <label className="field"><span className="lbl">Email</span><input name="email" type="email" required /></label>
        </div>
        {minor && (
          <Follow why={`At ${age}, the embassy needs consent from both parents — notarised, with copies of their passports. It takes the longest of anything on the list, so it is worth starting now.`}>
            <label className="field"><span className="lbl">Both parents — names &amp; passport numbers</span><input name="minorParents" placeholder="e.g. Anil Shah (Z1234567), Meera Shah (Z7654321)" /></label>
          </Follow>
        )}
        <p className="small muted" style={{ margin: "-4px 0 12px" }}>
          That is all we need here. Your date of birth, passport details and address come straight from your
          passport copy — nothing to type twice, and nothing to get wrong.
        </p>
      </Section>

      <Section title="Work & income">
        <div className="row">
          <label className="field"><span className="lbl">I am…</span>
            <select name="employmentType" value={work} onChange={(e) => setWork(e.target.value)}>
              <option value="employed">Employed (salaried)</option>
              <option value="business">Business owner</option>
              <option value="self">Self-employed / freelancer</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
              <option value="homemaker">Homemaker</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="field"><span className="lbl">{work === "retired" ? "Pension / income" : work === "homemaker" ? "Household income (optional)" : "Monthly / annual income"}</span><input name="income" placeholder="e.g. ₹1,20,000 / month" /></label>
        </div>

        {salaried && (
          <Follow why="For a salaried applicant the embassy asks for three months of pay slips and a leave-approval letter from your employer, so it needs their details.">
            <div className="row">
              <label className="field"><span className="lbl">Occupation / role</span><input name="occupation" placeholder="e.g. Software Engineer" /></label>
              <label className="field"><span className="lbl">Employer name</span><input name="employer" placeholder="Company name" /></label>
            </div>
            <label className="field"><span className="lbl">Employer address</span><input name="employerAddress" /></label>
          </Follow>
        )}

        {owner && (
          <Follow why="As a business owner you show the company's registration and its bank statement instead of pay slips — the registration number goes on the application form.">
            <div className="row">
              <label className="field"><span className="lbl">Business name</span><input name="employer" placeholder="Firm / company name" /></label>
              <label className="field"><span className="lbl">GST / company registration no.</span><input name="gstNo" /></label>
            </div>
            <div className="row">
              <label className="field"><span className="lbl">Your role</span><input name="occupation" placeholder="e.g. Director, Proprietor" /></label>
              <label className="field"><span className="lbl">Business address</span><input name="employerAddress" /></label>
            </div>
          </Follow>
        )}

        {work === "student" && (
          <Follow why="A student attaches a letter from their institution, and a parent usually sponsors the trip — we'll add both to your checklist.">
            <div className="row">
              <label className="field"><span className="lbl">School / college / university</span><input name="employer" /></label>
              <label className="field"><span className="lbl">Course / year</span><input name="occupation" placeholder="e.g. BBA, 2nd year" /></label>
            </div>
          </Follow>
        )}

        {work === "retired" && (
          <Follow why="Retired applicants show three months of pension statements, plus any rental or business income.">
            <label className="field"><span className="lbl">Last employer or source of pension</span><input name="employer" /></label>
          </Follow>
        )}

        {work === "homemaker" && (
          <Follow why="A homemaker's application rests on the spouse sponsoring it — their letter, ID and bank statement, and your marriage certificate.">
            <label className="field"><span className="lbl">Spouse&apos;s name &amp; occupation</span><input name="employer" placeholder="e.g. Rakesh Nair, Senior Manager at HDFC" /></label>
          </Follow>
        )}
      </Section>

      <Section title="Who is paying">
        <label className="field" style={{ maxWidth: 240 }}><span className="lbl">Who is paying for the trip?</span>
          <select name="funding" value={funding} onChange={(e) => setFunding(e.target.value)}>
            <option value="self">Myself</option>
            <option value="sponsor">Someone else (a sponsor)</option>
          </select>
        </label>
        {sponsored ? (
          <Follow why="When someone else pays, the embassy looks at them as closely as it looks at you — their letter, their ID, their bank statement and their tax returns. What they do for a living decides the rest of their list, so we ask that too.">
            <div className="row">
              <label className="field"><span className="lbl">Sponsor&apos;s full name</span><input name="sponsorName" /></label>
              <label className="field"><span className="lbl">Their relationship to you</span><input name="sponsorRelation" placeholder="e.g. father, spouse, employer" /></label>
            </div>
            <div className="row">
              <label className="field"><span className="lbl">What does your sponsor do?</span>
                <select name="sponsorWork" value={sponsorWork} onChange={(e) => setSponsorWork(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="employed">Employed (salaried)</option>
                  <option value="business">Owns a business</option>
                  <option value="self">Self-employed / freelancer</option>
                  <option value="retired">Retired</option>
                  <option value="other">Something else</option>
                </select>
              </label>
              <label className="field"><span className="lbl">Their annual income (roughly)</span><input name="sponsorIncome" placeholder="e.g. ₹35,00,000 / year" /></label>
            </div>
            {(sponsorWork === "business" || sponsorWork === "self") && (
              <Follow why="Their company shows its own papers — incorporation, GST certificate, and three years of statements and returns.">
                <div className="row">
                  <label className="field"><span className="lbl">Their company&apos;s name</span><input name="sponsorEmployer" /></label>
                  <label className="field"><span className="lbl">Its GST / registration no.</span><input name="sponsorGst" /></label>
                </div>
              </Follow>
            )}
            {(sponsorWork === "employed" || sponsorWork === "other") && (
              <Follow why="We'll need their pay slips and a letter from their employer confirming the salary.">
                <label className="field"><span className="lbl">Who do they work for?</span><input name="sponsorEmployer" placeholder="Company name" /></label>
              </Follow>
            )}
          </Follow>
        ) : (
          <p className="small muted" style={{ margin: "-4px 0 12px" }}>
            You&apos;ll need your own bank statement for the last 3 months, with every page stamped and signed by the bank.
          </p>
        )}
      </Section>

      <Section title="Ties to home country (make your case stronger)">
        <p className="small muted" style={{ margin: "0 0 10px" }}>
          None of this is compulsory, but it is the part that does the most work for you — it is where the
          application shows you have a life to come back to. Worth two extra minutes.
        </p>
        <label className="field"><span className="lbl">Family / dependants staying back home</span><input name="dependents" placeholder="e.g. spouse and 2 children, elderly parents" /></label>
        <label className="field"><span className="lbl">Investments &amp; assets at home</span><input name="investments" placeholder="e.g. 2 flats in Pune, FDs ₹20L, mutual funds ₹15L" /></label>
        <CountriesVisited />
      </Section>

      <Section title={schengen ? "Schengen history & companions" : "Travel history & companions"}>
        {schengen && (
          <>
            <label className="field"><span className="lbl">Have you held a Schengen visa before?</span><input name="prevSchengen" value={prevVisa} onChange={(e) => setPrevVisa(e.target.value)} placeholder="No — or e.g. France 2023" /></label>
            {hasPrevVisa && (
              <Follow why="Because you've held one before and used it properly, you may qualify for a long-term visa good for several years.">
                <label className="field" style={{ background: "var(--accent-bg)", borderRadius: 10, padding: "10px 12px" }}>
                  <span className="flex" style={{ gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" name="wantsLongTerm" value="yes" style={{ width: 16, height: 16 }} />
                    <span className="small">Yes, apply for a <b>long-term multiple-entry visa</b>. <b>Note:</b> this one needs travel insurance valid for a <b>full year</b>, not just the trip.</span>
                  </span>
                </label>
              </Follow>
            )}
          </>
        )}
        <label className="field"><span className="lbl">Travelling alone or with someone?</span><input name="travellingWith" placeholder="e.g. alone — or with spouse & 2 children / with a tour group" /></label>
        <label className="field"><span className="lbl">Anything else we should know</span><input name="notes" placeholder="optional" /></label>
      </Section>

      <Section title="Two questions the embassy form asks">
        <p className="small muted" style={{ margin: "0 0 12px" }}>
          Both of these appear on the application itself, so we have to carry an answer across for you. Almost
          everyone answers no to both, and if that&apos;s you this takes two seconds.
        </p>

        <label className="field" style={{ maxWidth: 420 }}><span className="lbl">Has an earlier visa application of yours ever been turned down?</span>
          <select value={refused} onChange={(e) => setRefused(e.target.value)}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        {refused === "yes" && (
          <Follow why="That happens to plenty of people and it is worked around rather than worked against — usually with the earlier letter and a short note on what has changed since. Send us the letter whenever you can find it.">
            <label className="field"><span className="lbl">Which country, and roughly when</span><input name="visaRefusals" placeholder="e.g. UK, 2021" /></label>
          </Follow>
        )}

        <label className="field" style={{ maxWidth: 420 }}><span className="lbl">Has anything ever gone wrong at a border — an overstay, or being turned away?</span>
          <select value={entryIssue} onChange={(e) => setEntryIssue(e.target.value)}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        {entryIssue === "yes" && (
          <Follow why="Tell us what you remember, including whether you were given a ban and for how long.">
            <label className="field"><span className="lbl">What happened, where, and when</span><input name="entryIssues" placeholder="e.g. overstayed 11 days in Dubai, 2019 — fine paid, no ban" /></label>
          </Follow>
        )}
      </Section>

      <Section title="Can you provide these?">
        <p className="small muted" style={{ margin: "0 0 12px" }}>
          This is your list, built from what you&apos;ve answered above — it changes as you change your answers.
          Tick everything you already have or can get. Leave the rest: we&apos;ll work through those with you, and
          knowing early is what stops a file stalling later.
        </p>
        {docGroups.map((g) => (
          <div key={g.title} style={{ marginBottom: 14 }}>
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>{g.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.items.map((it) => (
                <label key={it.label} className="flex" style={{ alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" name="have" value={it.label} style={{ width: 16, height: 16, marginTop: 3, flexShrink: 0 }} />
                  <span>
                    <span style={{ fontSize: 14 }}>{it.label}</span>
                    {it.note ? <span className="small muted" style={{ display: "block" }}>{it.note}</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {state && !state.ok && <p className="small" style={{ color: "var(--danger)", margin: "12px 0 0" }}>{state.message}</p>}
      <button className="primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
        {pending ? "Generating…" : "Submit & see my document list"}
      </button>
      <p className="small muted" style={{ margin: "10px 0 0", textAlign: "center" }}>
        Your answers go only to your travel agent, who prepares the file.
      </p>
    </form>
  );
}
