"use client";

import { useEffect, useState } from "react";

// Build a per-trip visa form link for a chosen visa TYPE (Schengen or any other
// country). The type + country ride along in the URL so the traveller's cover
// letter + document checklist match.
export default function VisaLinkBuilder({ tripId, tripName }: { tripId: string; tripName: string }) {
  const [origin, setOrigin] = useState("");
  const [type, setType] = useState("schengen");
  const [country, setCountry] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const isGeneric = type === "generic";
  const qs = isGeneric ? `?type=generic${country.trim() ? `&country=${encodeURIComponent(country.trim())}` : ""}` : "?type=schengen";
  const url = `${origin}/visa/${tripId}${qs}`;
  const label = isGeneric ? (country.trim() || "visitor") : "Schengen";

  function copy() {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }
  function wa() {
    const text = encodeURIComponent(`Please fill your ${label} visa details for ${tripName} here: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  }

  return (
    <div style={{ display: "grid", gap: 10, width: "100%" }}>
      <div className="flex" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="field" style={{ maxWidth: 200, marginBottom: 0 }}><span className="lbl">Visa type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="schengen">Schengen</option>
            <option value="generic">Other country…</option>
          </select>
        </label>
        {isGeneric && (
          <label className="field" style={{ maxWidth: 240, marginBottom: 0 }}><span className="lbl">Which country?</span>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. New Zealand" />
          </label>
        )}
      </div>
      <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ maxWidth: 340, fontSize: 12.5 }} />
        <button type="button" className="sm" onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</button>
        <button type="button" className="sm" onClick={wa} style={{ background: "#25D366", color: "#fff", borderColor: "transparent", fontWeight: 600 }}>↗ WhatsApp</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Sharing a <b>{label}</b> visa form — the traveller’s cover letter &amp; document checklist will match this type.</p>
    </div>
  );
}
