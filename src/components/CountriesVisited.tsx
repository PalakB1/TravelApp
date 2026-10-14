"use client";

import { useState } from "react";
import { SCHENGEN_COUNTRIES } from "@/lib/schengen";
import { OTHER_DESTINATIONS } from "@/lib/destinations";

// "Which countries have you been to?"
//
// This used to be a free-text box, and free text is where this answer goes to
// die: people write "few places in europe", or three countries out of eleven,
// or nothing. It matters more than almost anything else on the form — a record
// of going and coming back is the single strongest argument that someone will
// come back again — so it is worth making easy.
//
// Pick from a list, one tap each, and it becomes a row of chips they can see
// and correct. The hidden input carries the comma-joined value, so the server
// and the cover letter read an ordinary string.
export default function CountriesVisited({ name = "travelHistory" }: { name?: string }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [typed, setTyped] = useState("");

  const all = [...SCHENGEN_COUNTRIES.map((c) => c.name), ...OTHER_DESTINATIONS].sort((a, b) => a.localeCompare(b));
  const left = all.filter((c) => !picked.includes(c));

  const add = (c: string) => {
    const v = c.trim();
    if (v && !picked.includes(v)) setPicked([...picked, v]);
  };

  return (
    <div className="field">
      <span className="lbl">Countries you have travelled to</span>

      {picked.length > 0 && (
        <div className="flex" style={{ flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {picked.map((c) => (
            <button
              key={c}
              type="button"
              className="badge accent"
              onClick={() => setPicked(picked.filter((x) => x !== c))}
              title={`Remove ${c}`}
              style={{ cursor: "pointer", border: "none", font: "inherit" }}
            >
              {c} ✕
            </button>
          ))}
        </div>
      )}

      <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
        <select
          value=""
          onChange={(e) => { add(e.target.value); e.target.value = ""; }}
          style={{ maxWidth: 240 }}
          aria-label="Add a country you have travelled to"
        >
          <option value="">{picked.length ? "Add another…" : "Pick a country…"}</option>
          {left.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex" style={{ gap: 6 }}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(typed); setTyped(""); } }}
            placeholder="or type one"
            style={{ maxWidth: 170 }}
            aria-label="Type a country that is not on the list"
          />
          <button type="button" className="sm" onClick={() => { add(typed); setTyped(""); }}>Add</button>
        </div>
      </div>

      <input type="hidden" name={name} value={picked.join(", ")} />
      <p className="small muted" style={{ margin: "8px 0 0" }}>
        {picked.length === 0
          ? "If you have never travelled abroad, leave this empty — it is not a problem, it just means the rest of the form has to work harder."
          : `${picked.length} ${picked.length === 1 ? "country" : "countries"} — tap any to remove it.`}
      </p>
    </div>
  );
}
