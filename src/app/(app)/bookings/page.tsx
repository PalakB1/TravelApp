import Link from "next/link";
import { prisma } from "@/lib/db";
import { bookingTotal, bookingPaid, bookingBalance } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import TableSearch from "@/components/TableSearch";

export const dynamic = "force-dynamic";

function statusBadge(s: string) {
  const map: Record<string, string> = { confirmed: "green", travelled: "accent", enquiry: "amber", cancelled: "red" };
  return <span className={`badge ${map[s] || "gray"}`}>{s}</span>;
}

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: { trip: true, variant: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  const totalDue = bookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + bookingBalance(b), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bookings</h1>
          <p className="sub">{bookings.length} bookings · {formatINR(totalDue)} outstanding</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card">
          <div className="empty-cta">
            <span className="emoji">🎫</span>
            <div className="t">No bookings yet</div>
            <div className="d">Open a trip to add your first party, or just type it in the chat box on the dashboard.</div>
            <Link className="btn primary sm" href="/trips">Go to trips</Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "18px 20px" }}>
          <TableSearch placeholder="Search customer or trip…" tags={["confirmed", "enquiry", "travelled", "cancelled"]}>
          <table className="t">
            <thead>
              <tr><th style={{ paddingLeft: 20 }}>Customer</th><th>Trip</th><th>Pax</th><th>Status</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th></tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const bal = bookingBalance(b);
                return (
                  <tr key={b.id}>
                    <td style={{ paddingLeft: 20 }}><Link className="row-link" href={`/bookings/${b.id}`}>{b.customerName}</Link></td>
                    <td className="muted">{b.trip.name}</td>
                    <td className="muted">{b.pax}</td>
                    <td>{statusBadge(b.status)}</td>
                    <td className="num">{formatINR(bookingTotal(b))}</td>
                    <td className="num">{formatINR(bookingPaid(b))}</td>
                    <td className="num">{bal > 0 ? <span className="badge amber">{formatINR(bal)}</span> : <span className="badge green">paid</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </TableSearch>
        </div>
      )}
    </>
  );
}
