import Link from "next/link";
import { prisma } from "@/lib/db";
import { bookingTotal, bookingPaid, bookingBalance, isActive } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import TableSearch from "@/components/TableSearch";

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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p className="sub">{formatINR(totalCollected)} collected · {formatINR(totalDue)} outstanding</p>
        </div>
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
