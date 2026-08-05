"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";

// Deleting a booking takes three deliberate steps, because one stray tap
// shouldn't remove a customer with money against their name:
//   1. arm it        2. see what goes with it     3. type the name to confirm
// It's a soft delete — the booking goes to the recycle bin — but it still
// disappears from every list and total until restored, so the friction is warranted.
export default function DeleteBooking({
  action,
  id,
  customerName,
  paymentCount,
  paidLabel,
  balanceLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  customerName: string;
  paymentCount: number;
  paidLabel: string;
  balanceLabel: string;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState("");

  const matches = typed.trim().toLowerCase() === customerName.trim().toLowerCase();

  if (step === 0) {
    return (
      <button type="button" className="danger sm" onClick={() => setStep(1)}>
        Delete booking
      </button>
    );
  }

  return (
    <div
      className="card"
      style={{ padding: 14, borderColor: "var(--danger)", background: "var(--danger-bg)", maxWidth: 420, textAlign: "left" }}
    >
      {step === 1 ? (
        <>
          <div style={{ fontWeight: 600, color: "var(--danger)" }}>Delete {customerName}?</div>
          <ul className="small" style={{ margin: "8px 0 12px", paddingLeft: 18, color: "var(--text-2)", lineHeight: 1.6 }}>
            <li>{paymentCount} recorded payment{paymentCount === 1 ? "" : "s"} ({paidLabel}) go with it</li>
            <li>{balanceLabel} of outstanding balance stops being tracked</li>
            <li>They come off this trip&apos;s room and seat counts</li>
          </ul>
          <p className="small muted" style={{ marginTop: 0, marginBottom: 12 }}>
            It moves to the recycle bin, so it can be restored — but it disappears from every list and total until then.
          </p>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="sm" onClick={() => setStep(0)}>Keep it</button>
            <button type="button" className="danger sm" onClick={() => setStep(2)}>Continue</button>
          </div>
        </>
      ) : (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <div style={{ fontWeight: 600, color: "var(--danger)" }}>Last step</div>
          <label className="field" style={{ marginTop: 8 }}>
            <span className="lbl">
              Type <b>{customerName}</b> to confirm
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={customerName}
              autoFocus
              autoComplete="off"
            />
          </label>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="sm" onClick={() => { setStep(0); setTyped(""); }}>Cancel</button>
            {matches ? (
              <SubmitButton className="danger sm" pendingLabel="Deleting…">Delete permanently</SubmitButton>
            ) : (
              <button type="button" className="danger sm" disabled title="Type the name exactly to enable this">
                Delete permanently
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
