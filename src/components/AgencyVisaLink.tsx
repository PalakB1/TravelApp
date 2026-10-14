"use client";

import { useState } from "react";
import { SCHENGEN_COUNTRIES } from "@/lib/schengen";
import { OTHER_DESTINATIONS } from "@/lib/destinations";

// The agency's one permanent visa link.
//
// Unlike the per-trip link, this one never changes and needs nothing set up
// first: hand it to a corporate client, put it in a broadcast, print it on a
// card. Every traveller who fills it lands on the Visa desk with their own
// document list, whether or not they ever become a booking.
//
// The country picker only pre-fills the first question. Leave it on "let them
// choose" for a general link; set it when you already know where a particular
// group is going, so nobody picks the wrong one.
// `origin` is handed down from the server rather than read off `window` in an
// effect: the whole link is then in the first paint, with nothing to flicker and
// no second render to pay for.
export default function AgencyVisaLink({ orgId, agencyName, origin }: { orgId: string; agencyName: string; origin: string }) {
  const [country, setCountry] = useState("");
  const [copied, setCopied] = useState(false);

  const url = `${origin}/apply/${orgId}${country ? `?country=${encodeURIComponent(country)}` : ""}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});
  }
  function wa() {
    const where = country ? ` for ${country}` : "";
    const text = encodeURIComponent(
      `Hello — ${agencyName} here. Please fill your visa details${where} using this form: ${url}\n\n` +
      `It takes about 5 minutes, and at the end it shows you the exact list of documents you need to collect.`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  }

  return (
    <div className="card" style={{ borderColor: "var(--accent)" }}>
      <div className="card-title">
        🔗 Your permanent visa link
        <span className="small muted">one link, any number of travellers, no trip needed</span>
      </div>
      <p className="small" style={{ margin: "0 0 12px", color: "var(--text-2)", lineHeight: 1.7 }}>
        Send this to anyone — a company sending twenty people, a walk-in enquiry, a past customer. They pick the
        country they&apos;re travelling to and the form asks only the questions that country and their situation
        need. You get every detail here, with the minimum document list already worked out.
      </p>

      <div className="flex" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
        <label className="field" style={{ maxWidth: 260, marginBottom: 0 }}>
          <span className="lbl">Pre-fill the destination (optional)</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Let the traveller choose</option>
            <optgroup label="Schengen (Europe)">
              {SCHENGEN_COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
            </optgroup>
            <optgroup label="Everywhere else">
              {OTHER_DESTINATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          </select>
        </label>
      </div>

      <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ maxWidth: 380, fontSize: 12.5 }} aria-label="Your permanent visa form link" />
        <button type="button" className="sm" onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</button>
        <button type="button" className="sm" onClick={wa} style={{ background: "#25D366", color: "#fff", borderColor: "transparent", fontWeight: 600 }}>↗ WhatsApp</button>
        <a className="btn sm" href={url} target="_blank" rel="noopener">Preview</a>
      </div>
    </div>
  );
}
