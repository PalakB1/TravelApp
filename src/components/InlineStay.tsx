"use client";

import { useState } from "react";

// The party's stay shown inline next to their name — "27 Sep – 5 Oct" — and
// editable on click, matching InlineTitle. Blank dates mean the whole trip, so
// the trip's own dates are shown as the default and nothing needs setting
// unless someone joins late or leaves early.
export default function InlineStay({
  action,
  id,
  stayStart,
  stayEnd,
  tripStart,
  tripEnd,
  label,
  short,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  stayStart: string; // yyyy-mm-dd, "" when unset
  stayEnd: string;
  tripStart: string;
  tripEnd: string;
  label: string; // "27 Sep – 5 Oct"
  short: boolean; // staying fewer nights than the trip
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={action}
        onSubmit={() => setEditing(false)}
        style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
      >
        <input type="hidden" name="id" value={id} />
        <input name="stayStart" type="date" defaultValue={stayStart || tripStart} style={{ font: "initial", fontSize: 13, padding: "3px 7px", width: "auto" }} />
        <span className="muted">→</span>
        <input name="stayEnd" type="date" defaultValue={stayEnd || tripEnd} style={{ font: "initial", fontSize: 13, padding: "3px 7px", width: "auto" }} />
        <button className="btn sm primary" type="submit" style={{ font: "initial", fontSize: 13 }}>Save</button>
        <button type="button" className="btn sm" onClick={() => setEditing(false)} style={{ font: "initial", fontSize: 13 }}>Cancel</button>
      </form>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={short ? { color: "var(--warning)", fontWeight: 600 } : undefined}>{label}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Change this party's arrival / checkout"
        aria-label="Edit stay dates"
        style={{ font: "initial", fontSize: 11, cursor: "pointer", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "1px 6px", color: "var(--text-2)" }}
      >
        ✎
      </button>
    </span>
  );
}
