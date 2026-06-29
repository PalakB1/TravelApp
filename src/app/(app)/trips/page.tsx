import Link from "next/link";
import { prisma } from "@/lib/db";
import { tripFinancials } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import { duplicateTrip } from "../data-actions";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default async function TripsPage() {
  const trips = await prisma.trip.findMany({
    include: {
      itinerary: { include: { hotels: true } },
      cars: true,
      vendorBookings: true,
      bookings: { include: { variant: true, payments: true } },
    },
    orderBy: [{ departureDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Trips</h1>
          <p className="sub">Your packages, prices and departures.</p>
        </div>
        <Link className="btn primary" href="/trips/new">+ New trip</Link>
      </div>

      {trips.length === 0 ? (
        <div className="card"><div className="empty">No trips yet. Create your first trip.</div></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="t">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Trip</th><th>Departs</th><th>Nights</th>
                <th className="num">Revenue</th><th className="num">Profit</th><th className="num">Outstanding</th><th>Alerts</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => {
                const f = tripFinancials({ bookings: t.bookings, nights: t.itinerary, cars: t.cars, vendorBookings: t.vendorBookings, maxPerRoom: t.maxPerRoom });
                const alerts = f.unbookedNights + f.expiringHolds + f.shortRoomNights + (f.seatsShort > 0 ? 1 : 0);
                return (
                  <tr key={t.id}>
                    <td style={{ paddingLeft: 20 }}>
                      <div className="flex" style={{ gap: 8 }}>
                        <Link className="row-link" href={`/trips/${t.id}`}>{t.name}</Link>
                        <form action={duplicateTrip}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="sm" type="submit" title="Duplicate this itinerary" style={{ padding: "2px 8px", fontSize: 12 }}>Copy</button>
                        </form>
                      </div>
                      <div className="small muted">{t.destination || "—"} · {f.pax} pax</div>
                    </td>
                    <td className="muted small">{fmtDate(t.departureDate)}</td>
                    <td className="muted small">{f.nightCount}</td>
                    <td className="num">{formatINR(f.revenue)}</td>
                    <td className="num" style={{ color: f.profit >= 0 ? "var(--success)" : "var(--danger)" }}>{formatINR(f.profit)}</td>
                    <td className="num">{f.outstanding > 0 ? <span className="badge amber">{formatINR(f.outstanding)}</span> : <span className="muted">—</span>}</td>
                    <td>{alerts > 0 ? <span className="badge red">{[f.unbookedNights ? `${f.unbookedNights} unbooked` : "", f.shortRoomNights ? `${f.shortRoomNights} short rooms` : "", f.seatsShort ? `${f.seatsShort} no seat` : "", f.expiringHolds ? `${f.expiringHolds} holds` : ""].filter(Boolean).join(" · ")}</span> : <span className="badge green">all set</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
