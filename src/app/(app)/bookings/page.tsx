import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { bookingTotal, bookingPaid, bookingBalance, tripIsOver } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import ActivityLog from "@/components/ActivityLog";
import BookingsTable from "@/components/BookingsTable";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const scope = await requireScope();
  const bookings = await prisma.booking.findMany({
    where: scope.viaTrip,
    include: { trip: true, variant: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const totalDue = bookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + bookingBalance(b), 0);
  const rows = bookings.map((b) => ({
    id: b.id, name: b.customerName, trip: b.trip.name, pax: b.pax, status: b.status,
    visaStatus: b.visaStatus, visaHandledBy: b.visaHandledBy,
    total: bookingTotal(b), paid: bookingPaid(b), balance: bookingBalance(b),
    discount: b.discount, discountReason: b.discountReason,
    invoiceNo: b.invoiceNo, tripOver: tripIsOver(b.trip, now),
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bookings</h1>
          <p className="sub">{bookings.length} bookings · {formatINR(totalDue)} outstanding</p>
        </div>
        {bookings.length > 0 && (
          <a className="btn sm" href="/api/export/bookings" title="Download all bookings as a spreadsheet (CSV)">⬇ Download CSV</a>
        )}
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
          <BookingsTable rows={rows} showTrip />
        </div>
      )}

      <ActivityLog category="booking" title="Booking activity — new, status changes, deletes" />
    </>
  );
}
