import Link from "next/link";
import { prisma } from "@/lib/db";
import { tripFinancials, bookingBalance, bookingPaid, bookingTotal, bookingRevenue, bookingTax, isActive, isNightGap, holdExpiringSoon } from "@/lib/calc";
import { formatINR, formatINRShort } from "@/lib/money";
import ChatBox from "@/components/ChatBox";
import { Donut, HBars } from "@/components/Charts";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  if (!d) return "No date set";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function Dashboard() {
  const trips = await prisma.trip.findMany({
    include: {
      itinerary: { include: { hotels: true } },
      cars: true,
      vendorBookings: true,
      bookings: { include: { variant: true, payments: true } },
    },
    orderBy: [{ departureDate: "asc" }, { createdAt: "desc" }],
  });

  let revenue = 0, cost = 0, outstanding = 0, unbookedNights = 0, expiringHolds = 0, shortRoomNights = 0, seatIssues = 0, paxTotal = 0, bookingCount = 0;
  const perTrip = trips.map((t) => {
    const f = tripFinancials({ bookings: t.bookings, nights: t.itinerary, cars: t.cars, vendorBookings: t.vendorBookings, maxPerRoom: t.maxPerRoom });
    revenue += f.revenue;
    cost += f.cost;
    outstanding += f.outstanding;
    unbookedNights += f.unbookedNights;
    expiringHolds += f.expiringHolds;
    shortRoomNights += f.shortRoomNights;
    seatIssues += f.seatsShort > 0 ? 1 : 0;
    paxTotal += f.pax;
    bookingCount += f.bookingCount;
    return { trip: t, f };
  });
  const profit = revenue - cost;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  const upcoming = perTrip.filter((p) => !p.trip.departureDate || p.trip.departureDate >= new Date(Date.now() - 864e5));

  // Actionable operations list: unbooked nights + holds expiring soon
  type Alert = { tripId: string; tripName: string; text: string; kind: "gap" | "hold" };
  const alerts: Alert[] = [];
  for (const t of trips) {
    for (const n of t.itinerary) {
      if (isNightGap(n)) alerts.push({ tripId: t.id, tripName: t.name, kind: "gap", text: `No hotel in ${n.location}${n.date ? " · " + fmtDate(n.date) : ""}` });
      for (const h of n.hotels) {
        if (holdExpiringSoon(h.status, h.holdUntil)) alerts.push({ tripId: t.id, tripName: t.name, kind: "hold", text: `${h.hotelName} (${n.location}) hold ends ${fmtDate(h.holdUntil)}${h.source ? " · " + h.source : ""}` });
      }
    }
    for (const c of t.cars) {
      if (holdExpiringSoon(c.status, c.holdUntil)) alerts.push({ tripId: t.id, tripName: t.name, kind: "hold", text: `${c.label} hold ends ${fmtDate(c.holdUntil)}${c.source ? " · " + c.source : ""}` });
    }
  }
  for (const { trip, f } of perTrip) {
    if (f.shortRoomNights > 0) alerts.push({ tripId: trip.id, tripName: trip.name, kind: "gap", text: `${f.shortRoomNights} night${f.shortRoomNights > 1 ? "s" : ""} short on rooms — ${f.pax} travellers need ${f.roomsNeeded}/night` });
    if (f.seatsShort > 0) alerts.push({ tripId: trip.id, tripName: trip.name, kind: "gap", text: `${f.seatsShort} traveller${f.seatsShort > 1 ? "s" : ""} without a car seat — ${f.pax} travellers, ${f.carSeats} seats` });
  }

  // ---- Chart data ----
  const allActive = trips.flatMap((t) => t.bookings).filter((b) => isActive(b.status));
  const totalPaid = allActive.reduce((s, b) => s + bookingPaid(b), 0);
  const totalInvoiced = allActive.reduce((s, b) => s + bookingTotal(b), 0);

  const PKG: Record<string, { name: string; color: string }> = {
    land: { name: "Land only", color: "#0ea5e9" },
    lva: { name: "Land + visa", color: "#7c3aed" },
    full: { name: "Full package", color: "#0f9d6b" },
  };
  const pkgMap = new Map<string, number>();
  for (const b of allActive) pkgMap.set(b.packageType, (pkgMap.get(b.packageType) || 0) + bookingRevenue(b));
  const packageMix = [...pkgMap.entries()].map(([k, v]) => ({ name: PKG[k]?.name || k, value: v, color: PKG[k]?.color || "#9094ac" }));

  const revByTrip = perTrip
    .map(({ trip, f }) => ({ label: trip.name, value: f.revenue, sub: `profit ${formatINRShort(f.profit)} · ${Math.round(f.margin * 100)}% margin`, color: "var(--accent-grad)" }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const taxCollected = allActive.reduce((s, b) => s + bookingTax(b), 0);
  const taxRemitted = allActive.filter((b) => b.taxRemitted).reduce((s, b) => s + bookingTax(b), 0);
  const taxPending = taxCollected - taxRemitted;

  // top customers by outstanding, with their trips
  const customers = await prisma.customer.findMany({
    include: { bookings: { include: { variant: true, payments: true, trip: true } } },
  });
  const customerRows = customers
    .map((c) => {
      const act = c.bookings.filter((b) => isActive(b.status));
      const out = act.reduce((s, b) => s + bookingBalance(b), 0);
      const tripNames = [...new Set(act.map((b) => b.trip.name))];
      return { c, out, tripNames };
    })
    .filter((r) => r.tripNames.length > 0)
    .sort((a, b) => b.out - a.out);

  // recent payments for an activity feel
  const recentPayments = await prisma.payment.findMany({
    take: 6,
    orderBy: { date: "desc" },
    include: { booking: { include: { trip: true } } },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">{trips.length} trips · {bookingCount} bookings · {paxTotal} travellers</p>
        </div>
        <Link className="btn primary" href="/trips/new">+ New trip</Link>
      </div>

      <div className="metrics">
        <Link className="metric c-emerald" href="/reports/revenue">
          <div className="label">Revenue booked</div>
          <div className="value">{formatINRShort(revenue)}</div>
          <div className="foot">{formatINR(revenue)}</div>
        </Link>
        <Link className="metric c-amber" href="/reports/cost">
          <div className="label">Your cost</div>
          <div className="value">{formatINRShort(cost)}</div>
          <div className="foot">hotels, cars, drivers</div>
        </Link>
        <Link className="metric c-violet" href="/reports/profit">
          <div className="label">Profit</div>
          <div className="value">{formatINRShort(profit)}</div>
          <div className="foot">{margin}% margin</div>
        </Link>
        <Link className="metric c-sky" href="/reports/outstanding">
          <div className="label">Outstanding</div>
          <div className="value">{formatINRShort(outstanding)}</div>
          <div className="foot">due from customers</div>
        </Link>
        <Link className={`metric ${unbookedNights + expiringHolds + shortRoomNights + seatIssues > 0 ? "c-rose" : "c-emerald"}`} href="/reports/attention">
          <div className="label">Needs attention</div>
          <div className="value">{unbookedNights + expiringHolds + shortRoomNights + seatIssues}</div>
          <div className="foot">{unbookedNights} unbooked · {shortRoomNights} short rooms · {seatIssues} car seats · {expiringHolds} holds</div>
        </Link>
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ borderColor: "var(--warning-bg)" }}>
          <div className="card-title">Needs booking or about to expire</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.slice(0, 8).map((a, i) => (
              <Link key={i} href={`/trips/${a.tripId}`} className="between" style={{ padding: "9px 12px", borderRadius: 8, background: a.kind === "gap" ? "var(--danger-bg)" : "var(--warning-bg)" }}>
                <span style={{ fontSize: 13.5, color: a.kind === "gap" ? "var(--danger)" : "var(--warning)" }}>{a.text}</span>
                <span className="small muted">{a.tripName}</span>
              </Link>
            ))}
            {alerts.length > 8 && <div className="small muted">+{alerts.length - 8} more</div>}
          </div>
        </div>
      )}

      {allActive.length > 0 && (
        <>
          <div className="grid-2">
            <div className="card">
              <div className="card-title">Revenue by trip</div>
              {revByTrip.length === 0 ? <div className="empty small">No revenue yet.</div> : <HBars rows={revByTrip} />}
            </div>
            <div className="card">
              <div className="card-title">Package mix <span className="small muted">by revenue</span></div>
              <Donut segments={packageMix} centerTop={formatINRShort(revenue)} centerBottom="revenue" />
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-title">Collections</div>
              <Donut
                segments={[{ name: "Collected", value: totalPaid, color: "#0f9d6b" }, { name: "Outstanding", value: outstanding, color: "#e0435b" }]}
                centerTop={totalInvoiced > 0 ? `${Math.round((totalPaid / totalInvoiced) * 100)}%` : "0%"}
                centerBottom="collected"
              />
            </div>
            <div className="card">
              <div className="card-title">
                GST / TCS to govt
                <Link className="small" style={{ color: "var(--accent)" }} href="/tax">Manage →</Link>
              </div>
              <Donut
                segments={[{ name: "Remitted", value: taxRemitted, color: "#0f9d6b" }, { name: "Pending to pay", value: taxPending, color: "#e1670a" }]}
                centerTop={formatINRShort(taxPending)}
                centerBottom="pending"
              />
            </div>
          </div>
        </>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Quick entry — just chat</div>
          <ChatBox />
        </div>

        <div className="card">
          <div className="card-title">
            Upcoming trips
            <Link className="small" style={{ color: "var(--accent)" }} href="/trips">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty">No upcoming trips. Create one to get started.</div>
          ) : (
            <div className="stack">
              {upcoming.slice(0, 5).map(({ trip, f }) => {
                const filled = trip.capacity > 0 ? Math.min(100, Math.round((f.pax / trip.capacity) * 100)) : 0;
                return (
                  <Link key={trip.id} href={`/trips/${trip.id}`} style={{ display: "block" }}>
                    <div className="between" style={{ marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{trip.name}</div>
                        <div className="small muted">{trip.destination || "—"} · {fmtDate(trip.departureDate)}</div>
                      </div>
                      <div className="right">
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{formatINRShort(f.revenue)}</div>
                        <div className="small muted">{trip.capacity > 0 ? `${f.pax}/${trip.capacity} seats` : `${f.pax} pax`}</div>
                      </div>
                    </div>
                    {trip.capacity > 0 && (
                      <div className="bar"><span style={{ width: `${filled}%` }} /></div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {customerRows.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-title" style={{ padding: "18px 20px 0" }}>
            Customers &amp; their trips
            <Link className="small" style={{ color: "var(--accent)" }} href="/customers">View all {customers.length}</Link>
          </div>
          <table className="t" style={{ marginTop: 10 }}>
            <thead><tr><th style={{ paddingLeft: 20 }}>Customer</th><th>Trips</th><th className="num">Outstanding</th></tr></thead>
            <tbody>
              {customerRows.slice(0, 8).map(({ c, out, tripNames }) => (
                <tr key={c.id}>
                  <td style={{ paddingLeft: 20 }}><Link className="row-link" href={`/customers/${c.id}`}>{c.name}</Link></td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {tripNames.map((tn) => <span key={tn} className="badge accent">{tn}</span>)}
                    </div>
                  </td>
                  <td className="num">{out > 0 ? <span className="badge amber">{formatINR(out)}</span> : <span className="badge green">clear</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <div className="card-title">Recent payments</div>
        {recentPayments.length === 0 ? (
          <div className="empty">No payments yet.</div>
        ) : (
          <table className="t">
            <thead>
              <tr><th>Customer</th><th>Trip</th><th>Mode</th><th>Date</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id}>
                  <td>{p.booking.customerName}</td>
                  <td className="muted">{p.booking.trip.name}</td>
                  <td><span className="badge gray">{p.mode}</span></td>
                  <td className="muted small">{fmtDate(p.date)}</td>
                  <td className="num" style={{ fontWeight: 500 }}>{formatINR(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
