"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";

// Removing a spend takes three deliberate steps, for the same reason deleting a
// booking does: the ✕ sat in a dense table row, one stray tap changed a trip's
// profit, and nothing on screen said it had happened.
//
//   1. arm it   2. see exactly what goes   3. confirm
//
// It's a soft delete — the row moves to the recycle bin — but until it's
// restored the money is gone from every total, so the friction is earned.
export default function DeleteExpense({
  action,
  id,
  payee,
  amountLabel,
  tripName,
  personalFor,
  settled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  payee: string;
  amountLabel: string;
  tripName?: string | null;
  /** Name of whoever fronted the money, when this was a personal spend. */
  personalFor?: string | null;
  /** Already reimbursed — deleting it breaks a settled transfer. */
  settled?: boolean;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  if (step === 0) {
    return (
      <button type="button" className="sm" onClick={() => setStep(1)} aria-label={`Delete ${amountLabel} spend to ${payee}`}>
        ✕
      </button>
    );
  }

  return (
    <div
      className="card"
      style={{ padding: 13, borderColor: "var(--danger)", background: "var(--danger-bg)", maxWidth: 380, textAlign: "left" }}
    >
      {step === 1 ? (
        <>
          <div style={{ fontWeight: 600, color: "var(--danger)", fontSize: 13.5 }}>
            Delete {amountLabel} to {payee}?
          </div>
          <ul className="small" style={{ margin: "8px 0 12px", paddingLeft: 18, color: "var(--text-2)", lineHeight: 1.6 }}>
            {tripName
              ? <li><b>{tripName}</b> gets {amountLabel} cheaper — its profit and margin both move</li>
              : <li>Your overheads drop by {amountLabel}</li>}
            {personalFor && !settled && (
              <li>{personalFor} is owed this money — deleting it wipes the debt without paying it</li>
            )}
            {settled && (
              <li>This one was already reimbursed, so the transfer it belongs to stops adding up</li>
            )}
            <li>Any invoice attached to it goes with it</li>
          </ul>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="sm" onClick={() => setStep(0)}>Keep it</button>
            <button type="button" className="danger sm" onClick={() => setStep(2)}>Continue</button>
          </div>
        </>
      ) : (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <div style={{ fontWeight: 600, color: "var(--danger)", fontSize: 13.5 }}>Last step</div>
          <p className="small" style={{ margin: "6px 0 12px", color: "var(--text-2)" }}>
            It moves to the recycle bin and can be restored — but it leaves every total until then.
          </p>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="sm" onClick={() => setStep(0)}>Cancel</button>
            <SubmitButton className="danger sm" pendingLabel="Deleting…">Delete this spend</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
