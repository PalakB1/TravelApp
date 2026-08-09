"use client";

import { useState } from "react";
import { generateInvoice } from "@/app/(app)/data-actions";
import SubmitButton from "./SubmitButton";

// Raising a tax invoice before the trip has happened.
//
// It used to be flatly blocked, which was wrong — sometimes a client genuinely
// needs the invoice up front. But it shouldn't be a stray tap either: the number
// comes out of a gapless GST sequence, so an invoice raised by accident either
// leaves a hole in the run or has to be unpicked by hand.
//
// So: possible, but deliberate. Warn what it means, then make them type the
// customer's name. Once the trip is over it goes back to being one tap.
export default function EarlyInvoice({
  id,
  customerName,
  endsOn,
}: {
  id: string;
  customerName: string;
  /** Formatted trip end date, if it has one. */
  endsOn?: string | null;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState("");

  const matches = typed.trim().toLowerCase() === customerName.trim().toLowerCase();

  if (step === 0) {
    return (
      <button
        type="button"
        className="btn sm"
        onClick={() => setStep(1)}
        title="The trip hasn't finished — invoicing now takes a couple of extra steps"
      >
        Invoice early…
      </button>
    );
  }

  return (
    <div className="card" style={{ padding: 13, borderColor: "var(--warning)", background: "var(--warning-bg)", maxWidth: 400, textAlign: "left" }}>
      {step === 1 ? (
        <>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>This trip hasn&apos;t finished yet</div>
          <ul className="small" style={{ margin: "8px 0 12px", paddingLeft: 18, color: "var(--text-2)", lineHeight: 1.6 }}>
            {endsOn && <li>It ends on <b>{endsOn}</b></li>}
            <li>A GST invoice number is issued straight away, from a run that has to stay gapless</li>
            <li>If the price changes afterwards, the invoice has to be withdrawn by hand</li>
          </ul>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="sm" onClick={() => setStep(0)}>Not yet</button>
            <button type="button" className="primary sm" onClick={() => setStep(2)}>I still need it</button>
          </div>
        </>
      ) : (
        <form action={generateInvoice}>
          <input type="hidden" name="id" value={id} />
          {/* The server refuses an early invoice without this, so the extra
              steps can't be skipped by posting the plain form. */}
          <input type="hidden" name="confirmEarly" value="yes" />
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Last step</div>
          <label className="field" style={{ marginTop: 8 }}>
            <span className="lbl">Type <b>{customerName}</b> to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={customerName} autoFocus autoComplete="off" />
          </label>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="sm" onClick={() => { setStep(0); setTyped(""); }}>Cancel</button>
            {matches ? (
              <SubmitButton className="primary sm" pendingLabel="Generating…">Generate invoice</SubmitButton>
            ) : (
              <button type="button" className="primary sm" disabled title="Type the name exactly to enable this">Generate invoice</button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
