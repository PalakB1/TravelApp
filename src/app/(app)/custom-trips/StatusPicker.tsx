"use client";

import { useRef } from "react";
import { setCustomTripStatus } from "./actions";

const STATUSES = ["enquiry", "confirmed", "travelled", "cancelled"];

// A status dropdown that saves the moment you pick — no separate "save" step.
export default function StatusPicker({ id, status }: { id: string; status: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={setCustomTripStatus} ref={ref} style={{ display: "inline-block" }}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => ref.current?.requestSubmit()}
        className="badge"
        style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", fontWeight: 500 }}
        title="Change status"
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </form>
  );
}
