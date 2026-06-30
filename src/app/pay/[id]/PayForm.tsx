"use client";

import { useActionState } from "react";
import { submitPendingPayment, type PayResult } from "../actions";

export default function PayForm({ bookingId, customerName, suggested }: { bookingId: string; customerName: string; suggested?: number }) {
  const [state, action, pending] = useActionState<PayResult | undefined, FormData>(submitPendingPayment, undefined);
  const today = new Date().toISOString().slice(0, 10);

  if (state?.ok) {
    return (
      <div className="empty-cta" style={{ borderColor: "var(--success)" }}>
        <span className="emoji">✅</span>
        <div className="t">Payment submitted</div>
        <div className="d">{state.message} We’ll confirm it shortly — no need to do anything else.</div>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="field"><span className="lbl">Your name</span><input name="payerName" defaultValue={customerName} required /></label>
      <div className="row">
        <label className="field"><span className="lbl">Amount paid (₹)</span><input name="amount" defaultValue={suggested || ""} placeholder="e.g. 50000" required /></label>
        <label className="field"><span className="lbl">Date paid</span><input name="date" type="date" defaultValue={today} /></label>
      </div>
      <div className="row">
        <label className="field"><span className="lbl">Paid by</span>
          <select name="mode" defaultValue="upi"><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="card">Card</option><option value="cash">Cash</option><option value="other">Other</option></select>
        </label>
        <label className="field"><span className="lbl">Reference / UTR</span><input name="reference" placeholder="transaction id (optional)" /></label>
      </div>
      <label className="field"><span className="lbl">Payment screenshot</span><input name="screenshot" type="file" accept="image/*" style={{ padding: 7 }} /></label>
      <label className="field"><span className="lbl">Note (optional)</span><input name="note" placeholder="anything we should know" /></label>
      {state && !state.ok && <p className="small" style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.message}</p>}
      <button className="primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
        {pending ? "Submitting…" : "Submit payment"}
      </button>
      <p className="small muted" style={{ marginTop: 10, textAlign: "center" }}>Your payment will be reviewed and confirmed by our team.</p>
    </form>
  );
}
