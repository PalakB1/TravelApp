import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR, formatINRShort } from "@/lib/money";
import {
  customOrgId, ITEM_TYPES, ITEM_ICON, ITEM_LABEL,
  ctRevenue, ctCost, ctProfit, ctTaxable, ctGst, ctTcs, ctItemsNonTax, ctTotal, ctPaid, ctOutstanding,
} from "../lib";
import { addItem, deleteItem, addPayment, deletePayment, updateCustomTrip, deleteCustomTrip } from "../actions";
import StatusPicker from "../StatusPicker";

export const dynamic = "force-dynamic";

function d(v: Date | null) { return v ? new Date(v).toISOString().slice(0, 10) : ""; }
function fmt(v: Date | null) { return v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"; }

export default async function CustomTripDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await customOrgId();
  if (!orgId) notFound();

  const t = await prisma.customTrip.findFirst({
    where: { id, orgId },
    include: { items: { orderBy: { createdAt: "asc" } }, payments: { orderBy: { date: "desc" } } },
  });
  if (!t) notFound();

  const rev = ctRevenue(t), cost = ctCost(t), profit = ctProfit(t);
  const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0;
  const paid = ctPaid(t), out = ctOutstanding(t);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="small muted"><Link href="/custom-trips" style={{ color: "var(--text-2)" }}>← Custom trips</Link></div>
          <h1 style={{ marginTop: 6 }}>{t.title}</h1>
          <p className="sub">
            {t.customerId ? <Link className="row-link" href={`/customers/${t.customerId}`}>{t.clientName}</Link> : t.clientName}{t.clientPhone ? ` · ${t.clientPhone}` : ""} · {fmt(t.startDate)}{t.endDate ? ` – ${fmt(t.endDate)}` : ""}
            <span style={{ marginLeft: 10 }}><StatusPicker id={t.id} status={t.status} /></span>
          </p>
        </div>
      </div>

      {/* Financials */}
      <div className="metrics">
        <div className="metric c-emerald"><div className="label">Revenue</div><div className="value">{formatINRShort(rev)}</div><div className="foot">pre-tax sale value</div></div>
        <div className="metric c-amber"><div className="label">Your cost</div><div className="value">{formatINRShort(cost)}</div><div className="foot">across all items</div></div>
        <div className="metric c-violet"><div className="label">Profit</div><div className="value">{formatINRShort(profit)}</div><div className="foot">{margin}% margin</div></div>
        <div className="metric c-sky"><div className="label">Outstanding</div><div className="value">{formatINRShort(out)}</div><div className="foot">{formatINRShort(paid)} received</div></div>
      </div>

      {/* Line items */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: "18px 20px 0" }}>Line items <span className="small muted">flights, hotels, transfers — anything you’re booking</span></div>
        <table className="t" style={{ marginTop: 10 }}>
          <thead><tr><th style={{ paddingLeft: 20 }}>Item</th><th>Supplier</th><th>Date</th><th className="num">Qty</th><th className="num">Cost</th><th className="num">Sell</th><th>GST</th><th className="num">Line</th><th></th></tr></thead>
          <tbody>
            {t.items.length === 0 && <tr><td colSpan={9} className="empty" style={{ padding: 24 }}>No items yet — add the first one below.</td></tr>}
            {t.items.map((i) => (
              <tr key={i.id}>
                <td style={{ paddingLeft: 20 }}>{ITEM_ICON[i.type]} <b>{i.description}</b> <span className="small muted">{ITEM_LABEL[i.type]}</span></td>
                <td className="muted small">{i.supplier || "—"}</td>
                <td className="muted small">{fmt(i.date)}</td>
                <td className="num">{i.qty}</td>
                <td className="num">{formatINR(i.cost)}</td>
                <td className="num">{formatINR(i.sell)}</td>
                <td>{i.taxable ? <span className="badge sky">GST</span> : <span className="badge gray">no tax</span>}</td>
                <td className="num" style={{ fontWeight: 500 }}>{formatINR(i.sell * i.qty)}</td>
                <td className="num">
                  <form action={deleteItem}><input type="hidden" name="id" value={i.id} /><button className="sm" type="submit">✕</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "6px 20px 20px", borderTop: "1px solid var(--border)" }}>
          <form action={addItem}>
            <input type="hidden" name="customTripId" value={t.id} />
            <div className="row-3">
              <label className="field"><span className="lbl">Type</span>
                <select name="type" defaultValue="flight">{ITEM_TYPES.map((x) => <option key={x.value} value={x.value}>{x.icon} {x.label}</option>)}</select>
              </label>
              <label className="field" style={{ gridColumn: "span 2" }}><span className="lbl">Description</span><input name="description" placeholder="e.g. DEL→CDG Air France, 4 Jun" required /></label>
            </div>
            <div className="row-3">
              <label className="field"><span className="lbl">Supplier (optional)</span><input name="supplier" placeholder="airline / hotel / DMC" /></label>
              <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
              <label className="field"><span className="lbl">Qty / pax</span><input name="qty" type="number" min="1" defaultValue="1" /></label>
            </div>
            <div className="row-3">
              <label className="field"><span className="lbl">Cost (your buy)</span><input name="cost" placeholder="₹ per unit" /></label>
              <label className="field"><span className="lbl">Sell (you charge)</span><input name="sell" placeholder="₹ per unit" /></label>
              <label className="field"><span className="lbl">GST/TCS on this line?</span>
                <select name="taxable" defaultValue="yes"><option value="yes">Yes — taxable</option><option value="no">No tax</option></select>
              </label>
            </div>
            <button className="primary" type="submit">+ Add item</button>
          </form>
        </div>
      </div>

      <div className="grid-2">
        {/* Invoice breakdown */}
        <div className="card">
          <div className="card-title">Invoice</div>
          <table className="t mini">
            <tbody>
              <tr><td>Taxable value</td><td className="num">{formatINR(ctTaxable(t))}</td></tr>
              {t.discount > 0 && <tr><td className="muted">— after discount {formatINR(t.discount)}</td><td className="num muted">included</td></tr>}
              <tr><td>GST @ {t.gstRate}%</td><td className="num">{formatINR(ctGst(t))}</td></tr>
              <tr><td>TCS @ {t.tcsRate}%</td><td className="num">{formatINR(ctTcs(t))}</td></tr>
              {ctItemsNonTax(t) > 0 && <tr><td>Non-taxable items</td><td className="num">{formatINR(ctItemsNonTax(t))}</td></tr>}
              <tr style={{ fontWeight: 600 }}><td>Total billed</td><td className="num">{formatINR(ctTotal(t))}</td></tr>
              <tr><td className="muted">Received</td><td className="num muted">−{formatINR(paid)}</td></tr>
              <tr style={{ fontWeight: 600 }}><td>Outstanding</td><td className="num">{formatINR(out)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Payments */}
        <div className="card">
          <div className="card-title">Payments</div>
          {t.payments.length === 0 ? <div className="empty small">No payments recorded.</div> : (
            <table className="t mini">
              <tbody>
                {t.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmt(p.date)} <span className="badge gray">{p.mode}</span>{p.note ? <span className="small muted"> · {p.note}</span> : ""}</td>
                    <td className="num">{formatINR(p.amount)}</td>
                    <td className="num"><form action={deletePayment}><input type="hidden" name="id" value={p.id} /><button className="sm" type="submit">✕</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={addPayment} style={{ marginTop: 12 }}>
            <input type="hidden" name="customTripId" value={t.id} />
            <div className="row-3">
              <label className="field"><span className="lbl">Amount</span><input name="amount" placeholder="₹" /></label>
              <label className="field"><span className="lbl">Mode</span><select name="mode" defaultValue="upi"><option>upi</option><option>card</option><option>bank</option><option>cash</option><option>other</option></select></label>
              <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
            </div>
            <label className="field"><span className="lbl">Note (optional)</span><input name="note" placeholder="advance / balance / UTR…" /></label>
            <button className="primary" type="submit">+ Record payment</button>
          </form>
        </div>
      </div>

      {/* Trip settings */}
      <div className="card">
        <div className="card-title">Trip details</div>
        <form action={updateCustomTrip}>
          <input type="hidden" name="id" value={t.id} />
          <div className="row-3">
            <label className="field"><span className="lbl">Trip title</span><input name="title" defaultValue={t.title} /></label>
            <label className="field"><span className="lbl">Client name</span><input name="clientName" defaultValue={t.clientName} /></label>
            <label className="field"><span className="lbl">Phone</span><input name="clientPhone" defaultValue={t.clientPhone || ""} /></label>
          </div>
          {/* Status is changed from the header picker; keep it here so Save doesn't reset it. */}
          <input type="hidden" name="status" value={t.status} />
          <div className="row-3">
            <label className="field"><span className="lbl">Start</span><input name="startDate" type="date" defaultValue={d(t.startDate)} /></label>
            <label className="field"><span className="lbl">End</span><input name="endDate" type="date" defaultValue={d(t.endDate)} /></label>
            <div className="field" />
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Discount (₹)</span><input name="discount" defaultValue={t.discount || ""} placeholder="0" /></label>
            <label className="field"><span className="lbl">GST rate %</span><input name="gstRate" type="number" defaultValue={t.gstRate} /></label>
            <label className="field"><span className="lbl">TCS rate %</span><input name="tcsRate" type="number" defaultValue={t.tcsRate} /></label>
          </div>
          <label className="field"><span className="lbl">Notes</span><input name="notes" defaultValue={t.notes || ""} placeholder="anything to remember" /></label>
          <button className="primary" type="submit">Save details</button>
        </form>
      </div>

      <div className="card" style={{ borderColor: "var(--danger-bg)" }}>
        <div className="between">
          <span className="small muted">Deleting removes this custom trip and all its items and payments.</span>
          <form action={deleteCustomTrip}><input type="hidden" name="id" value={t.id} /><button className="sm" type="submit" style={{ color: "var(--danger)" }}>Delete custom trip</button></form>
        </div>
      </div>
    </>
  );
}
