"use client";

import { useActionState, useState } from "react";
import { submitVisaApplicant, type VisaResult } from "../actions";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div className="small" style={{ fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function VisaForm({ tripId }: { tripId: string }) {
  const [state, action, pending] = useActionState<VisaResult | undefined, FormData>(submitVisaApplicant, undefined);
  const [prevVisa, setPrevVisa] = useState("");
  const hasPrevVisa = prevVisa.trim() !== "" && prevVisa.trim().toLowerCase() !== "no";

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
      <input type="hidden" name="tripId" value={tripId} />

      <Section title="You (as in passport)">
        <label className="field"><span className="lbl">Full name</span><input name="fullName" placeholder="As printed in passport" required /></label>
        <div className="row-3">
          <label className="field"><span className="lbl">Date of birth</span><input name="dob" type="date" /></label>
          <label className="field"><span className="lbl">Place of birth</span><input name="placeOfBirth" placeholder="City" /></label>
          <label className="field"><span className="lbl">Nationality</span><input name="nationality" defaultValue="Indian" /></label>
        </div>
        <label className="field" style={{ maxWidth: 240 }}><span className="lbl">Marital status</span>
          <select name="maritalStatus" defaultValue=""><option value="">Select…</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select>
        </label>
      </Section>

      <Section title="Passport">
        <div className="row-3">
          <label className="field"><span className="lbl">Passport number</span><input name="passportNo" /></label>
          <label className="field"><span className="lbl">Date of issue</span><input name="passportIssue" type="date" /></label>
          <label className="field"><span className="lbl">Date of expiry</span><input name="passportExpiry" type="date" /></label>
        </div>
        <label className="field" style={{ maxWidth: 240 }}><span className="lbl">Place of issue</span><input name="passportPlace" placeholder="City" /></label>
      </Section>

      <Section title="Contact">
        <label className="field"><span className="lbl">Residential address</span><input name="address" placeholder="House / street / area" /></label>
        <div className="row-3">
          <label className="field"><span className="lbl">City</span><input name="city" /></label>
          <label className="field"><span className="lbl">PIN code</span><input name="pin" /></label>
          <label className="field"><span className="lbl">Phone</span><input name="phone" /></label>
        </div>
        <label className="field"><span className="lbl">Email</span><input name="email" type="email" /></label>
      </Section>

      <Section title="Work & income">
        <div className="row-3">
          <label className="field"><span className="lbl">I am…</span>
            <select name="employmentType" defaultValue="employed">
              <option value="employed">Employed (salaried)</option>
              <option value="business">Business owner</option>
              <option value="self">Self-employed / freelancer</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
              <option value="homemaker">Homemaker</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="field"><span className="lbl">Occupation / role</span><input name="occupation" placeholder="e.g. Software Engineer, Director" /></label>
          <label className="field"><span className="lbl">Monthly / annual income</span><input name="income" placeholder="e.g. ₹1,20,000 / month" /></label>
        </div>
        <div className="row-3">
          <label className="field"><span className="lbl">Employer / business name</span><input name="employer" placeholder="Company / firm name" /></label>
          <label className="field"><span className="lbl">GST no. (if business)</span><input name="gstNo" placeholder="business owners only" /></label>
          <label className="field"><span className="lbl">Employer / business address</span><input name="employerAddress" /></label>
        </div>
      </Section>

      <Section title="Ties to home country (make your case stronger)">
        <label className="field"><span className="lbl">Family / dependants staying back in India</span><input name="dependents" placeholder="e.g. spouse and 2 children, elderly parents" /></label>
        <label className="field"><span className="lbl">Investments & assets in India</span><input name="investments" placeholder="e.g. 2 flats in Pune, FDs ₹20L, mutual funds ₹15L" /></label>
        <label className="field"><span className="lbl">Past international travel</span><input name="travelHistory" placeholder="e.g. UK 2019, Singapore 2022, Dubai 2023 — or None" /></label>
      </Section>

      <Section title="Funding & Schengen history">
        <div className="row-3">
          <label className="field"><span className="lbl">Who is paying?</span>
            <select name="funding" defaultValue="self"><option value="self">Myself</option><option value="sponsor">A sponsor</option></select>
          </label>
          <label className="field"><span className="lbl">Sponsor name (if any)</span><input name="sponsorName" /></label>
          <label className="field"><span className="lbl">Relation to sponsor</span><input name="sponsorRelation" placeholder="e.g. father, spouse" /></label>
        </div>
        <label className="field"><span className="lbl">Previous Schengen visas?</span><input name="prevSchengen" value={prevVisa} onChange={(e) => setPrevVisa(e.target.value)} placeholder="No — or e.g. France 2023" /></label>
        {hasPrevVisa && (
          <label className="field" style={{ background: "var(--accent-bg)", borderRadius: 10, padding: "10px 12px" }}>
            <span className="flex" style={{ gap: 8, cursor: "pointer" }}>
              <input type="checkbox" name="wantsLongTerm" value="yes" style={{ width: 16, height: 16 }} />
              <span className="small">I would like to apply for a <b>long-term multiple-entry visa</b> (you’ve held a Schengen visa before, so you may qualify). <b>Note:</b> this needs travel insurance valid for <b>1 year</b>.</span>
            </span>
          </label>
        )}
        <label className="field"><span className="lbl">Travelling alone or with someone?</span><input name="travellingWith" placeholder="e.g. alone — or with spouse & 2 children / with a tour group" /></label>
        <label className="field"><span className="lbl">Anything else</span><input name="notes" placeholder="optional" /></label>
      </Section>

      {state && !state.ok && <p className="small" style={{ color: "var(--danger)", margin: "12px 0 0" }}>{state.message}</p>}
      <button className="primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
        {pending ? "Generating…" : "Generate my cover letter & checklist"}
      </button>
    </form>
  );
}
