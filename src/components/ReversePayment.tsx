"use client";

import { useActionState } from "react";
import { reversePayment, type ReverseResult } from "@/app/(app)/data-actions";
import Combobox from "./Combobox";
import SubmitButton from "./SubmitButton";

export type PaidBooking = { id: string; label: string; sub: string };

// Money going back to a customer.
//
// Kept as its own form rather than a direction toggle on "Record a payment",
// because the two are different acts with different consequences and a toggle
// is exactly the kind of thing that gets left in the wrong position. This one
// is deliberately a little harder to reach and asks for a reason before it will
// submit — the reason ends up on the customer's receipt and in your books, and
// "why did we give ₹18,000 back in March" is a question that always gets asked
// eventually.
//
// Only customers who have actually paid something appear in the list: you
// cannot reverse money that never arrived.
export default function ReversePayment({ bookings }: { bookings: PaidBooking[] }) {
  const [state, action, pending] = useActionState<ReverseResult | undefined, FormData>(reversePayment, undefined);

  return (
    <div className="card" style={{ borderColor: "var(--danger-bg)" }}>
      <div className="card-title">
        Reverse a payment
        <span className="small muted">money going back — a dropped inclusion, or a price renegotiated after payment</span>
      </div>

      {bookings.length === 0 ? (
        <div className="empty">Nobody has paid anything yet, so there is nothing to reverse.</div>
      ) : (
        <form action={action}>
          <div className="row-3">
            <label className="field"><span className="lbl">Customer · group</span>
              <Combobox
                name="bookingId"
                placeholder="Type a name…"
                emptyHint="Only customers who have paid something appear here."
                options={bookings}
              />
            </label>
            <label className="field"><span className="lbl">Amount going back</span><input name="amount" placeholder="5000 or 5k" required /></label>
            <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Back by</span>
              <select name="mode" defaultValue="bank">
                <option value="bank">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card reversal</option>
                <option value="other">Adjusted against balance</option>
              </select>
            </label>
            <label className="field"><span className="lbl">Reason</span>
              <input name="note" placeholder="e.g. Blue Lagoon unavailable — removed from package" required />
            </label>
            <div className="flex" style={{ alignItems: "flex-end", paddingBottom: 12 }}>
              <SubmitButton className="danger" pendingLabel="Reversing…">Reverse payment</SubmitButton>
            </div>
          </div>

          {state && (
            <p className="small" style={{ margin: 0, color: state.ok ? "var(--success)" : "var(--danger)" }}>
              {state.ok ? `✓ ${state.message}` : state.message}
            </p>
          )}
          {!state && (
            <p className="small muted" style={{ margin: 0 }}>
              This lowers what the customer has paid, so their balance goes back up by the same amount. The original
              payment stays on the record — reversals sit beside it rather than rubbing it out.
            </p>
          )}
          {pending && <span className="sr-only">Working…</span>}
        </form>
      )}
    </div>
  );
}
