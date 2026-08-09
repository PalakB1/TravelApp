"use client";

import { useState } from "react";
import { markItemPaid } from "@/app/(app)/expenses/actions";
import SubmitButton from "./SubmitButton";

// "Mark paid" on a hotel, car or vendor booking.
//
// The point is that logging the spend is no longer a second job you have to
// remember. This asks the few things the ledger needs that the booking doesn't
// already know — which account the money left, how, and when — then writes the
// expense itself, linked to this exact item.
//
// The amount is pre-filled with what the item was held at, so the common case
// (it cost what you expected) is one tap.
export default function MarkPaid({
  refId,
  label,
  estimate,
  banks,
  myName,
}: {
  /** "hotel:<id>" | "car:<id>" | "vendor:<id>" */
  refId: string;
  label: string;
  estimate: number;
  banks: string[];
  myName: string;
}) {
  const [open, setOpen] = useState(false);
  const [personal, setPersonal] = useState(false);
  // Its own datalist, keyed off the item, so the component drops into any page
  // without that page having to provide one — and two instances never collide.
  const listId = `banks-${refId.replace(":", "-")}`;

  if (!open) {
    return (
      <button type="button" className="sm" onClick={() => setOpen(true)} title="Record the payment and log the spend">
        ✓ Mark paid
      </button>
    );
  }

  return (
    <form action={markItemPaid} className="form-box" style={{ marginTop: 8 }}>
      <input type="hidden" name="ref" value={refId} />
      <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
        Paying for {label}
        <span className="muted" style={{ fontWeight: 400 }}> — this also logs it in Costing, so you don&apos;t enter it twice.</span>
      </div>
      <div className="row-3">
        <label className="field">
          <span className="lbl">Amount paid</span>
          <input name="amount" defaultValue={estimate || ""} placeholder="what it was held at" />
        </label>
        <label className="field">
          <span className="lbl">Paid from</span>
          <input name="bankName" list={listId} placeholder="HDFC current / ICICI…" />
          <datalist id={listId}>{banks.map((b) => <option key={b} value={b} />)}</datalist>
        </label>
        <label className="field">
          <span className="lbl">How</span>
          <select name="paymentMode" defaultValue="bank">
            <option value="bank">Bank transfer</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      <div className="row-3">
        <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
        <label className="field"><span className="lbl">Paid to</span><input name="payee" placeholder="defaults to the supplier" /></label>
        <label className="field"><span className="lbl">Notes</span><input name="notes" placeholder="advance / balance…" /></label>
      </div>
      <div className="row" style={{ alignItems: "end" }}>
        <label className="field" style={{ justifyContent: "center" }}>
          <span className="flex" style={{ gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" name="paidPersonally" style={{ width: "auto" }} checked={personal} onChange={(e) => setPersonal(e.target.checked)} />
            <span className="lbl" style={{ margin: 0 }}>Paid from personal money <span className="small muted">— becomes a loan until repaid</span></span>
          </span>
        </label>
        {personal && (
          <label className="field"><span className="lbl">Who paid</span><input name="paidBy" defaultValue={myName} /></label>
        )}
      </div>
      <div className="flex" style={{ gap: 8 }}>
        <SubmitButton className="primary sm" pendingLabel="Saving…">Save payment</SubmitButton>
        <button type="button" className="sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
