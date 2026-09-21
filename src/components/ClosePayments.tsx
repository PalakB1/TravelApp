"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";

// "We're not chasing the rest."
//
// A customer pays all but 500 and that 500 is never arriving. The two things
// people did before were chase it forever or type in a fake 500 payment — and
// the fake payment quietly corrupts the one number you most need to trust,
// which is what actually came in. This accepts the shortfall instead: the
// balance stays exactly as it is, and the booking stops being chased.
export default function ClosePayments({
  closeAction,
  reopenAction,
  id,
  customerName,
  shortfallLabel,
  isClosed,
  closedBy,
  closedOn,
  closedNote,
}: {
  closeAction: (formData: FormData) => void | Promise<void>;
  reopenAction: (formData: FormData) => void | Promise<void>;
  id: string;
  customerName: string;
  /** Pre-formatted amount still outstanding, e.g. "₹500". */
  shortfallLabel: string;
  isClosed: boolean;
  closedBy?: string | null;
  closedOn?: string | null;
  closedNote?: string | null;
}) {
  const [arming, setArming] = useState(false);

  if (isClosed) {
    return (
      <div className="card" style={{ padding: 13, borderColor: "var(--success)", background: "var(--success-bg)" }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--success)" }}>Payments closed</div>
        <p className="small" style={{ margin: "6px 0 10px", color: "var(--text-2)" }}>
          {shortfallLabel} is still outstanding and still shows on the invoice — it&apos;s simply not being
          chased any more.{closedBy ? ` Accepted by ${closedBy}` : ""}{closedOn ? ` on ${closedOn}` : ""}.
          {closedNote ? ` “${closedNote}”` : ""}
        </p>
        <form action={reopenAction}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="sm" pendingLabel="Reopening…">Reopen payments</SubmitButton>
        </form>
      </div>
    );
  }

  if (!arming) {
    return (
      <button type="button" className="sm" onClick={() => setArming(true)} title="Accept the remaining balance and stop chasing it">
        Close payments
      </button>
    );
  }

  return (
    <form action={closeAction} className="form-box" style={{ marginTop: 8 }}>
      <input type="hidden" name="id" value={id} />
      <div style={{ fontWeight: 600, fontSize: 13.5 }}>Close payments for {customerName}?</div>
      <ul className="small" style={{ margin: "8px 0 10px", paddingLeft: 18, color: "var(--text-2)", lineHeight: 1.6 }}>
        <li><b>{shortfallLabel}</b> stays outstanding on the invoice — nothing is written off or faked</li>
        <li>They drop out of Who owes you, the overdue count and the reminders</li>
        <li>You can reopen it at any time</li>
      </ul>
      <label className="field">
        <span className="lbl">Why, if it&apos;s worth recording <span className="small muted">optional</span></span>
        <input name="note" placeholder="e.g. rounded off at the customer's request" autoFocus autoComplete="off" />
      </label>
      <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="sm" onClick={() => setArming(false)}>Cancel</button>
        <SubmitButton className="primary sm" pendingLabel="Closing…">Accept and close</SubmitButton>
      </div>
    </form>
  );
}
