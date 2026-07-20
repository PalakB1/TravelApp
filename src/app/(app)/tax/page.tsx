import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { bookingGst, bookingTcs, bookingTax, isActive } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import { markTaxRemittedBulk, setTaxRemitted } from "../data-actions";
import SelectAll from "@/components/SelectAll";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default async function TaxPage() {
  const scope = await requireScope();
  const bookings = await prisma.booking.findMany({
    where: scope.viaTrip,
    include: { trip: true, variant: true },
    orderBy: { createdAt: "desc" },
  });
  const active = bookings.filter((b) => isActive(b.status) && bookingTax(b) > 0);

  const gstCollected = active.reduce((s, b) => s + bookingGst(b), 0);
  const tcsCollected = active.reduce((s, b) => s + bookingTcs(b), 0);
  const totalTax = gstCollected + tcsCollected;
  const remitted = active.filter((b) => b.taxRemitted).reduce((s, b) => s + bookingTax(b), 0);
  const pending = totalTax - remitted;

  const pendingRows = active.filter((b) => !b.taxRemitted);
  const remittedRows = active.filter((b) => b.taxRemitted);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>GST / TCS — tax to govt</h1>
          <p className="sub">Tax you collect from clients and owe the government. Tag bookings as remitted when you pay.</p>
        </div>
      </div>

      <div className="metrics">
        <div className="metric c-sky"><div className="label">GST collected (5%)</div><div className="value">{formatINR(gstCollected)}</div></div>
        <div className="metric c-amber"><div className="label">TCS collected (2%)</div><div className="value">{formatINR(tcsCollected)}</div></div>
        <div className="metric c-emerald"><div className="label">Remitted to govt</div><div className="value">{formatINR(remitted)}</div></div>
        <div className={`metric ${pending > 0 ? "c-rose" : "c-emerald"}`}><div className="label">Pending to pay</div><div className="value">{formatINR(pending)}</div><div className="foot">{pendingRows.length} bookings</div></div>
      </div>

      <div className="card">
        <div className="card-title">Pending — to remit</div>
        {pendingRows.length === 0 ? (
          <div className="empty">All collected tax has been remitted. 🎉</div>
        ) : (
          <form action={markTaxRemittedBulk}>
            <table className="t">
              <thead>
                <tr>
                  <th style={{ width: 28 }}><SelectAll /></th>
                  <th>Customer</th><th>Trip</th><th className="num">GST</th><th className="num">TCS</th><th className="num">Total tax</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.map((b) => (
                  <tr key={b.id}>
                    <td><input type="checkbox" name="ids" value={b.id} style={{ width: 16, height: 16 }} /></td>
                    <td><Link className="row-link" href={`/bookings/${b.id}`}>{b.customerName}</Link></td>
                    <td className="muted">{b.trip.name}</td>
                    <td className="num">{formatINR(bookingGst(b))}</td>
                    <td className="num">{formatINR(bookingTcs(b))}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{formatINR(bookingTax(b))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="form-box" style={{ marginTop: 14 }}>
              <div className="small muted" style={{ marginBottom: 10 }}>Tick the bookings you paid the government for, then record it:</div>
              <div className="row-3">
                <label className="field"><span className="lbl">Payment / challan date</span><input name="date" type="date" /></label>
                <label className="field"><span className="lbl">Reference (challan / GSTR)</span><input name="note" placeholder="e.g. GSTR-3B Sep, challan 12345" /></label>
                <div className="flex" style={{ alignItems: "flex-end", paddingBottom: 12 }}>
                  <button className="primary sm" type="submit">Mark selected as remitted</button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div className="card-title">Remitted</div>
        {remittedRows.length === 0 ? (
          <div className="empty small">Nothing remitted yet.</div>
        ) : (
          <table className="t">
            <thead><tr><th>Customer</th><th>Trip</th><th className="num">Tax</th><th>Remitted on</th><th>Reference</th><th></th></tr></thead>
            <tbody>
              {remittedRows.map((b) => (
                <tr key={b.id}>
                  <td><Link className="row-link" href={`/bookings/${b.id}`}>{b.customerName}</Link></td>
                  <td className="muted">{b.trip.name}</td>
                  <td className="num" style={{ fontWeight: 500 }}>{formatINR(bookingTax(b))}</td>
                  <td className="muted small">{fmtDate(b.taxRemittedOn)}</td>
                  <td className="muted small">{b.taxRemittedNote || "—"}</td>
                  <td className="num">
                    <form action={setTaxRemitted}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="remit" value="0" />
                      <button className="sm" type="submit">Undo</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
