import Link from "next/link";
import { prisma } from "@/lib/db";
import { pricePerRoom } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import TableSearch from "@/components/TableSearch";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default async function HotelsPage() {
  const hotels = await prisma.hotelBooking.findMany({
    include: { night: { include: { trip: true } } },
  });
  hotels.sort((a, b) => (a.night.date ? +a.night.date : 0) - (b.night.date ? +b.night.date : 0));

  const totalRooms = hotels.reduce((s, h) => s + h.rooms, 0);
  const totalCost = hotels.reduce((s, h) => s + h.cost, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hotels</h1>
          <p className="sub">{hotels.length} bookings · {totalRooms} rooms · {formatINR(totalCost)} across all trips</p>
        </div>
      </div>

      <div className="card" style={{ padding: "18px 20px" }}>
        {hotels.length === 0 ? (
          <div className="empty-cta">
            <span className="emoji">🏨</span>
            <div className="t">No hotels booked yet</div>
            <div className="d">Open a trip and add hotels night by night — they’ll all show up here.</div>
            <Link className="btn primary sm" href="/trips">Go to trips</Link>
          </div>
        ) : (
          <TableSearch placeholder="Search hotel, location or trip…" tags={["final", "hold", "unbooked"]}>
            <table className="t">
              <thead>
                <tr>
                  <th>Hotel</th><th>Trip</th><th>Location</th><th>Date</th>
                  <th className="num">Rooms</th><th className="num">Cost</th><th className="num">/room</th>
                  <th>Status</th><th>Hold until</th><th>Source</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((h) => (
                  <tr key={h.id}>
                    <td><Link className="row-link" href={`/trips/${h.night.tripId}`}>{h.hotelName}</Link></td>
                    <td className="muted">{h.night.trip.name}</td>
                    <td>{h.night.location}</td>
                    <td className="muted small">{fmtDate(h.night.date)}</td>
                    <td className="num">{h.rooms}</td>
                    <td className="num">{formatINR(h.cost)}</td>
                    <td className="num muted">{h.rooms > 0 ? formatINR(pricePerRoom(h)) : "—"}</td>
                    <td><span className={`badge ${h.status === "final" ? "green" : h.status === "hold" ? "amber" : "red"}`}>{h.status}</span></td>
                    <td className="muted small">{fmtDate(h.holdUntil)}</td>
                    <td className="muted small">{h.source || "—"}</td>
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
