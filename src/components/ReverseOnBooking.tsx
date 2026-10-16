"use client";

import { useActionState } from "react";
import { reversePayment, type ReverseResult } from "@/app/(app)/data-actions";
import SubmitButton from "./SubmitButton";

// Reversing money on the booking itself, which is where you usually are when it
// happens — looking at the customer whose hotel fell through.
//
// Same action as the one on the Payments page, so the same rule applies: a
// reason is required, and you cannot give back more than came in. The customer
// is already known here, so there is nothing to search for.
export default function ReverseOnBooking({ bookingId, paid }: { bookingId: string; paid: string }) {
  const [state, action, pending] = useActionState<ReverseResult | undefined, FormData>(reversePayment, undefined);

  return (
    <details className="add">
      <summary>↩ Reverse a payment</summary>
      <div className="form-box">
        <form action={action}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <div className="row-3">
            <label className="field"><span className="lbl">Amount going back</span><input name="amount" placeholder="5000 or 5k" required /></label>
            <label className="field"><span className="lbl">Back by</span>
              <select name="mode" defaultValue="bank">
                <option value="bank">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card reversal</option>
                <option value="other">Adjusted against balance</option>
              </select>
            </label>
            <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
          </div>
          <label className="field"><span className="lbl">Reason</span>
            <input name="note" placeholder="e.g. Blue Lagoon unavailable — removed from package" required />
          </label>
          <SubmitButton className="danger sm" pendingLabel="Reversing…">Reverse payment</SubmitButton>

          {state ? (
            <p className="small" style={{ margin: "10px 0 0", color: state.ok ? "var(--success)" : "var(--danger)" }}>
              {state.ok ? `✓ ${state.message}` : state.message}
            </p>
          ) : (
            <p className="small muted" style={{ margin: "10px 0 0" }}>
              {paid} received so far — that is the most you can reverse. The balance goes back up by whatever you
              send back, and the original payment stays on the record.
            </p>
          )}
          {pending && <span className="sr-only">Working…</span>}
        </form>
      </div>
    </details>
  );
}
