"use client";

import { useState } from "react";
import { parseAmount, formatMoney, currencySymbol, type MoneyCfg } from "@/lib/money";
import { splitCash } from "@/lib/cashsplit";

// Splitting one agreed price into the part that goes on the invoice and the
// part that doesn't.
//
// A trip is often sold at a single number — "₹4,20,000 all in" — of which some
// is settled in cash and therefore carries no GST and no TCS and never appears
// on a tax invoice. Working that split out by hand is where arithmetic mistakes
// get baked into a booking: people divide the total by 1.05, or apply TCS to
// the cash half, and nobody notices until the return is being filed.
//
// So: type the agreed total, say what share is cash, and read off both halves
// with the tax already worked out. The percentage has an explicit direction —
// "30% is cash" and "30% is on the invoice" are opposite instructions and a
// bare percentage box is an invitation to mean one and get the other.
export default function CashSplit({
  taxLabel,
  taxLabel2,
  gstRate,
  tcsRate,
  money,
}: {
  taxLabel: string;
  taxLabel2: string;
  gstRate: number;
  tcsRate: number;
  /** Plain {currency, locale} — a formatter function cannot cross from a
   *  server component, so the formatting happens on this side of the line. */
  money: MoneyCfg;
}) {
  const fmt = (n: number) => formatMoney(n, money);
  const symbol = currencySymbol(money);
  const [total, setTotal] = useState("");
  const [pct, setPct] = useState("30");
  const [side, setSide] = useState<"cash" | "billed">("cash");

  const agreed = parseAmount(total);
  const share = Math.min(100, Math.max(0, Number(pct) || 0));
  const { cash, grossBilled, taxable, tax, tax2 } = splitCash(agreed, share, side, gstRate, tcsRate);
  const billedShare = side === "cash" ? 100 - share : share;

  const ready = agreed > 0;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 14, background: "var(--surface-2)" }}>
      <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
        Split an all-in price
        <span className="muted" style={{ fontWeight: 400 }}> — works out the cash part and the part that goes on the invoice</span>
      </div>

      <div className="row-3">
        <label className="field" style={{ marginBottom: 8 }}>
          <span className="lbl">Agreed total for the trip</span>
          <input value={total} onChange={(e) => setTotal(e.target.value)} placeholder="420000 or 4.2L" inputMode="decimal" />
        </label>
        <label className="field" style={{ marginBottom: 8 }}>
          <span className="lbl">Share</span>
          <input value={pct} onChange={(e) => setPct(e.target.value)} type="number" min={0} max={100} step={1} />
        </label>
        <label className="field" style={{ marginBottom: 8 }}>
          <span className="lbl">…of the total is</span>
          <select value={side} onChange={(e) => setSide(e.target.value as "cash" | "billed")}>
            <option value="cash">cash — no {taxLabel}, no {taxLabel2}</option>
            <option value="billed">on the invoice — {taxLabel} + {taxLabel2} apply</option>
          </select>
        </label>
      </div>

      {!ready ? (
        <p className="small muted" style={{ margin: 0 }}>
          Enter the agreed total and both halves appear here, with the tax already worked backwards out of the
          invoice side — so the two together come to exactly what the customer pays.
        </p>
      ) : (
        <>
          <div className="row">
            <div style={{ flex: 1, minWidth: 190 }}>
              <div className="small muted" style={{ marginBottom: 4 }}>Cash — stays off the invoice</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(cash)}</div>
              <div className="small muted">{side === "cash" ? share : 100 - share}% · no {taxLabel}, no {taxLabel2}</div>
            </div>
            <div style={{ flex: 1, minWidth: 190 }}>
              <div className="small muted" style={{ marginBottom: 4 }}>On the invoice</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(grossBilled)}</div>
              <div className="small muted">{billedShare}% · including tax</div>
            </div>
          </div>

          <table className="t" style={{ marginTop: 10, fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ paddingLeft: 0 }}>Taxable value <span className="small muted">goes in “Land cost”</span></td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt(taxable)}</td>
              </tr>
              <tr><td style={{ paddingLeft: 0 }}>{taxLabel} @ {gstRate}%</td><td className="num">{fmt(tax)}</td></tr>
              <tr><td style={{ paddingLeft: 0 }}>{taxLabel2} @ {tcsRate}%</td><td className="num">{fmt(tax2)}</td></tr>
              <tr>
                <td style={{ paddingLeft: 0, fontWeight: 600 }}>Invoice total</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt(grossBilled)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 0 }}>Cash <span className="small muted">goes in “Non-taxable amount”</span></td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt(cash)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 0, fontWeight: 600 }}>Customer pays in all</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt(grossBilled + cash)}</td>
              </tr>
            </tbody>
          </table>

          <p className="small muted" style={{ margin: "10px 0 0" }}>
            Put <b>{symbol}{taxable.toLocaleString(money.locale)}</b> in <b>Land cost</b> and{" "}
            <b>{symbol}{cash.toLocaleString(money.locale)}</b> in <b>Non-taxable amount</b> below, then save. The tax is
            added by the booking itself, so entering the taxable value is what makes the invoice come to{" "}
            {fmt(grossBilled)}.
          </p>
        </>
      )}
    </div>
  );
}
