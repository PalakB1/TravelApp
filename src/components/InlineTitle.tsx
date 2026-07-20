"use client";

import { useState } from "react";

// A heading that becomes editable on click — so titles no longer look like
// static text you can't change. Submits a server action (passed in) that reads
// { id, value }.
export default function InlineTitle({ action, id, value }: { action: (formData: FormData) => void | Promise<void>; id: string; value: string }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form action={action} onSubmit={() => setEditing(false)} style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="id" value={id} />
        <input name="value" defaultValue={value} autoFocus onFocus={(e) => e.currentTarget.select()} style={{ font: "inherit", fontWeight: "inherit", padding: "2px 8px", minWidth: 220, maxWidth: "100%" }} />
        <button className="btn sm primary" type="submit" style={{ font: "initial", fontSize: 13 }}>Save</button>
        <button type="button" className="btn sm" onClick={() => setEditing(false)} style={{ font: "initial", fontSize: 13 }}>Cancel</button>
      </form>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {value}
      <button type="button" onClick={() => setEditing(true)} title="Rename" aria-label="Rename" style={{ font: "initial", fontSize: 12, cursor: "pointer", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "3px 7px", color: "var(--text-2)" }}>✎ Edit</button>
    </span>
  );
}
