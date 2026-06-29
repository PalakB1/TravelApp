import Link from "next/link";
import { prisma } from "@/lib/db";
import { bookingTotal, bookingPaid, bookingBalance, isActive } from "@/lib/calc";
import { formatINR, formatINRShort } from "@/lib/money";
import TableSearch from "@/components/TableSearch";
import Combobox from "@/components/Combobox";
import { addPayment } from "../data-actions";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PaymentsPage() {
  const bookings = await prisma.booking.findMany({
    include: { trip: true, variant: true, payments: true },
  });
  const recent = await prisma.payment.findMany({
    take: 25,
    orderBy: { date: "desc" },
    include: { booking: { include: { trip: true } } },
  });

  const owing = bookings
    .filter((b) => isActive(b.status) && bookingBalance(b) > 0)
    .sort((a, c) => bookingBalance(c) - bookingBalance(a));

  const totalDue = owing.reduce((s, b) => s + bookingBalance(b), 0);
  const totalCollected = bookings.reduce((s, b) => s + bookingPaid(b), 0);

  // Pick-from-list of existing customers/groups — payments only ever attach to
  // a booking that already exists (no new customers created here).
  const payable = bookings
    .filter((b) => isActive(b.status))
    .map((b) => ({ b, bal: bookingBalance(b) }))
    .sort((a, c) => (c.bal - a.bal) || a.b.customerName.localeCompare(c.b.customerName));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p className="sub">{formatINR(totalCollected)} collected · {formatINR(totalDue)} outstanding</p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Record a payment <span className="small muted">type a name to find an existing customer</span></div>
        {payable.length === 0 ? (
          <div className="empty">No bookings yet. Add a booking on a trip first, then you can record payments here.</div>
        ) : (
          <form action={addPayment}>
            <div className="row-3">
              <label className="field"><span className="lbl">Customer · group</span>
                <Combobox
                  name="bookingId"
                  placeholder="Type a name…"
                  emptyHint="No match. New customers are added from a trip booking."
                  options={payable.map(({ b, bal }) => ({
                    id: b.id,
                    label: b.customerName,
                    sub: `${b.trip.name}${bal > 0 ? ` · ${formatINRShort(bal)} due` : " · fully paid"}`,
                  }))}
                />
              </label>
              <label className="field"><span className="lbl">Amount</span><input name="amount" placeholder="40000 or 40k" required /></label>
              <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
            </div>
            <div className="row-3">
              <label className="field"><span className="lbl">Mode</span>
                <select name="mode" defaultValue="upi"><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option><option value="other">Other</option></select>
              </label>
              <label className="field"><span className="lbl">Note</span><input name="note" placeholder="advance / installment 2" /></label>
              <div className="flex" style={{ alignItems: "flex-end", paddingBottom: 12 }}>
                <button className="primary" type="submit">Record payment</button>
              </div>
            </div>
            <p className="small muted" style={{ margin: 0 }}>Don’t see someone? They need a booking on a trip first — that’s the only place a new customer is created.</p>
          </form>
        )}
      </div>

      <div className="card">
        <div className="card-title">Outstanding — who still owes you</div>
        {owing.length === 0 ? (
          <div className="empty">Everyone’s paid up. Nice.</div>
        ) : (
          <table className="t">
            <thead><tr><th>Customer</th><th>Trip</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {owing.map((b) => (
                <tr key={b.id}>
                  <td><Link className="row-link" href={`/bookings/${b.id}`}>{b.customerName}</Link></td>
                  <td className="muted">{b.trip.name}</td>
                  <td className="num">{formatINR(bookingTotal(b))}</td>
                  <td className="num">{formatINR(bookingPaid(b))}</td>
                  <td className="num"><span className="badge amber">{formatINR(bookingBalance(b))}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-title">Payment history</div>
        {recent.length === 0 ? (
          <div className="empty">No payments recorded yet.</div>
        ) : (
          <TableSearch placeholder="Search customer, trip or mode…" tags={["upi", "cash", "card", "bank"]}>
          <table className="t">
            <thead><tr><th>Date</th><th>Customer</th><th>Trip</th><th>Mode</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td className="muted small">{fmtDate(p.date)}</td>
                  <td><Link className="row-link" href={`/bookings/${p.bookingId}`}>{p.booking.customerName}</Link></td>
                  <td className="muted">{p.booking.trip.name}</td>
                  <td><span className="badge gray">{p.mode}</span></td>
                  <td className="num" style={{ fontWeight: 500 }}>{formatINR(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableSearch>
        )}
      </div>
    </>
  );
}
