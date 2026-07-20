"use client";

import { useActionState, useState } from "react";
import { formatINR } from "@/lib/money";
import { submitPendingPayment, type PayResult } from "../../actions";

type Person = { id: string; name: string; balance: number };
type Trip = { id: string; name: string; people: Person[] };

export default function UniversalPayForm({ trips }: { trips: Trip[] }) {
  const [state, action, pending] = useActionState<PayResult | undefined, FormData>(submitPendingPayment, undefined);
  const [tripId, setTripId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const trip = trips.find((t) => t.id === tripId);
  const person = trip?.people.find((p) => p.id === bookingId);

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
      <label className="field"><span className="lbl">Which trip?</span>
        <select value={tripId} onChange={(e) => { setTripId(e.target.value); setBookingId(""); }} required>
          <option value="">Select your trip…</option>
          {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>

      {trip && (
        <label className="field"><span className="lbl">Your name</span>
          <select value={bookingId} onChange={(e) => setBookingId(e.target.value)} required>
            <option value="">Select your name…</option>
            {trip.people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.balance > 0 ? ` — ${formatINR(p.balance)} due` : " — fully paid"}</option>
            ))}
          </select>
        </label>
      )}

      {person && (
        <>
          <input type="hidden" name="bookingId" value={person.id} />
          <input type="hidden" name="payerName" value={person.name} />
          {person.balance > 0 && (
            <p className="small muted" style={{ margin: "-4px 0 12px" }}>Outstanding for {person.name}: <b>{formatINR(person.balance)}</b></p>
          )}
          <div className="row">
            <label className="field"><span className="lbl">Amount paid (₹)</span><input name="amount" defaultValue={person.balance > 0 ? person.balance : ""} placeholder="e.g. 50000" required /></label>
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
        </>
      )}
    </form>
  );
}
