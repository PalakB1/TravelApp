import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { tripFinancials, bookingBalance, bookingPaid, bookingTotal, bookingRevenue, bookingTax, isActive } from "@/lib/calc";
import { formatINR, formatINRShort } from "@/lib/money";
import QuickAddButton from "@/components/QuickAddButton";
import { Donut, HBars } from "@/components/Charts";
import DateRangeFilter from "@/components/DateRangeFilter";
import { ctRevenue, ctProfit, ctCost, ctOutstanding, ctTax, ctTotal, ctPaid } from "../custom-trips/lib";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  if (!d) return "No date set";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const scope = await requireScope();

  // Date-range filter — default is a rolling one-year window from today.
  const { from: fromQ, to: toQ } = await searchParams;
  const _now = new Date();
  const _startToday = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());
  const fromStr = fromQ && !isNaN(Date.parse(fromQ)) ? fromQ : ymd(_startToday);
  const toStr = toQ && !isNaN(Date.parse(toQ)) ? toQ : ymd(new Date(_startToday.getFullYear() + 1, _startToday.getMonth(), _startToday.getDate()));
  const rangeFrom = new Date(fromStr + "T00:00:00");
  const rangeTo = new Date(toStr + "T23:59:59");
  // Undated (unscheduled) trips always show; dated ones must fall in the window.
  const tripInRange = { OR: [{ departureDate: null }, { departureDate: { gte: rangeFrom, lte: rangeTo } }] };

  const trips = await prisma.trip.findMany({
    where: { ...scope.tripWhere, ...tripInRange },
    include: {
      itinerary: { include: { hotels: true } },
      cars: true,
      vendorBookings: true,
      bookings: { where: { deletedAt: null }, include: { variant: true, payments: true } },
    },
    orderBy: [{ departureDate: "asc" }, { createdAt: "desc" }],
  });

  let revenue = 0, cost = 0, outstanding = 0, unbookedNights = 0, expiringHolds = 0, shortRoomNights = 0, seatIssues = 0, paxTotal = 0, bookingCount = 0;
  let hotelCost = 0, carRental = 0, driverCost = 0, extrasCost = 0, inclusionsCost = 0, driversTotal = 0, carsTotal = 0, taxCollectedAll = 0;
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
    hotelCost += f.hotelCost;
    carRental += f.carRental;
    driverCost += f.driverCost;
    extrasCost += f.extrasCost;
    inclusionsCost += f.inclusionsCost;
    driversTotal += f.hiredDrivers;
    carsTotal += t.cars.length;
    taxCollectedAll += f.taxCollected;
    return { trip: t, f };
  });

  // Custom trips (bespoke, per-client) in the same window — folded into the totals.
  const customTrips = await prisma.customTrip.findMany({
    where: { orgId: scope.orgId, status: { not: "cancelled" }, OR: [{ startDate: null }, { startDate: { gte: rangeFrom, lte: rangeTo } }] },
    include: { items: true, payments: true },
  });
  const custRevenue = customTrips.reduce((s, ct) => s + ctRevenue(ct), 0);
  const custCost = customTrips.reduce((s, ct) => s + ctCost(ct), 0);
  const custOut = customTrips.reduce((s, ct) => s + ctOutstanding(ct), 0);
  const custTax = customTrips.reduce((s, ct) => s + ctTax(ct), 0);
  const custBilled = customTrips.reduce((s, ct) => s + ctTotal(ct), 0);
  const custPaid = customTrips.reduce((s, ct) => s + ctPaid(ct), 0);
  revenue += custRevenue;
  cost += custCost;
  outstanding += custOut;

  const profit = revenue - cost;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  const upcoming = perTrip.filter((p) => !p.trip.departureDate || p.trip.departureDate >= new Date(Date.now() - 864e5));

  // The detailed "needs attention" list lives on /reports/attention (reached by
  // clicking the tile) — kept off the dashboard so it doesn't dominate the page.

  // ---- Chart data ----
  const allActive = trips.flatMap((t) => t.bookings).filter((b) => isActive(b.status));
  const totalPaid = allActive.reduce((s, b) => s + bookingPaid(b), 0) + custPaid;
  const totalInvoiced = allActive.reduce((s, b) => s + bookingTotal(b), 0) + custBilled;

  const PKG: Record<string, { name: string; color: string }> = {
    land: { name: "Land only", color: "#0ea5e9" },
    lva: { name: "Land + visa", color: "#7c3aed" },
    full: { name: "Full package", color: "#0f9d6b" },
  };
  const pkgMap = new Map<string, number>();
  for (const b of allActive) pkgMap.set(b.packageType, (pkgMap.get(b.packageType) || 0) + bookingRevenue(b));
  const packageMix = [...pkgMap.entries()].map(([k, v]) => ({ name: PKG[k]?.name || k, value: v, color: PKG[k]?.color || "#9094ac" }));

  const revByTrip = perTrip
    .map(({ trip, f }) => ({ label: trip.name, value: f.revenue, sub: `${f.pax} travellers${f.hiredDrivers > 0 ? ` + ${f.hiredDrivers} driver${f.hiredDrivers > 1 ? "s" : ""}` : ""} · profit ${formatINRShort(f.profit)} · ${Math.round(f.margin * 100)}%`, color: "var(--accent-grad)", href: `/trips/${trip.id}` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const customTripRows = customTrips
    .map((ct) => ({ id: ct.id, title: ct.title, clientName: ct.clientName, rev: ctRevenue(ct), profit: ctProfit(ct) }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 6);

  const taxCollected = allActive.reduce((s, b) => s + bookingTax(b), 0) + custTax;
  const taxRemitted = allActive.filter((b) => b.taxRemitted).reduce((s, b) => s + bookingTax(b), 0);
  const taxPending = taxCollected - taxRemitted;

  // top customers by outstanding, with their trips
  const customers = await prisma.customer.findMany({
    where: { orgId: scope.orgId },
    // Only bookings on trips this member may see (else other trip names leak).
    include: { bookings: { where: { deletedAt: null, ...(scope.tripIds ? { trip: { id: { in: scope.tripIds } } } : {}) }, include: { variant: true, payments: true, trip: true } } },
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
    where: { booking: { ...scope.viaTrip, deletedAt: null } },
    take: 6,
    orderBy: { date: "desc" },
    include: { booking: { include: { trip: true } } },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">{trips.length} trips · {bookingCount} bookings · {paxTotal} travellers{driversTotal > 0 ? ` + ${driversTotal} driver${driversTotal > 1 ? "s" : ""} = ${paxTotal + driversTotal} people` : ""} · {carsTotal} cars</p>
        </div>
        <div className="flex" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <DateRangeFilter from={fromStr} to={toStr} />
          <Link className="btn primary" href="/trips/new">+ New trip</Link>
        </div>
      </div>

      <QuickAddButton className="qe-launch" ariaLabel="Open quick entry">
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>⚡ Quick entry</span>
          <span className="small muted">Log a payment, expense, booking, hotel &amp; more — in seconds</span>
        </span>
        <span style={{ fontSize: 24, color: "var(--accent)", fontWeight: 600, lineHeight: 1 }}>＋</span>
      </QuickAddButton>

      <div className="metrics">
        <Link className="metric c-emerald" href="/reports/revenue">
          <div className="label">Revenue booked</div>
          <div className="value">{formatINRShort(revenue)}</div>
          <div className="foot">+ GST/TCS {formatINRShort(taxCollected)} → billed {formatINRShort(totalInvoiced)}</div>
        </Link>
        <Link className="metric c-amber" href="/reports/cost">
          <div className="label">Your cost</div>
          <div className="value">{formatINRShort(cost)}</div>
          <div className="foot">hotels {formatINRShort(hotelCost)} · cars {formatINRShort(carRental)}{driverCost > 0 ? ` · drivers ${formatINRShort(driverCost)}` : ""}{extrasCost > 0 ? ` · extras ${formatINRShort(extrasCost)}` : ""}{inclusionsCost > 0 ? ` · inclusions ${formatINRShort(inclusionsCost)}` : ""}</div>
        </Link>
        <Link className="metric c-violet" href="/reports/profit">
          <div className="label">Profit</div>
          <div className="value">{formatINRShort(profit)}</div>
          <div className="foot">{margin}% margin</div>
        </Link>
        <Link className="metric c-sky" href="/reports/outstanding">
          <div className="label">Outstanding</div>
          <div className="value">{formatINRShort(outstanding)}</div>
          <div className="foot">{formatINRShort(totalPaid)} received · due from customers</div>
        </Link>
        <Link className={`metric ${unbookedNights + expiringHolds + shortRoomNights + seatIssues > 0 ? "c-rose" : "c-emerald"}`} href="/reports/attention">
          <div className="label">Needs attention</div>
          <div className="value">{unbookedNights + expiringHolds + shortRoomNights + seatIssues}</div>
          <div className="foot">{unbookedNights} unbooked · {shortRoomNights} short rooms · {seatIssues} car seats · {expiringHolds} holds</div>
        </Link>
      </div>

      {allActive.length > 0 && (
        <>
          <div className="grid-2">
            <div className="card">
              <div className="card-title">Revenue by trip <span className="small muted">click a trip to open & add</span></div>
              {revByTrip.length === 0 ? <div className="empty small">No group-trip revenue in this range.</div> : <HBars rows={revByTrip} />}
              {customTripRows.length > 0 && (
                <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div className="small muted" style={{ marginBottom: 8 }}>✦ Custom trips</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {customTripRows.map((ct) => (
                      <Link key={ct.id} href={`/custom-trips/${ct.id}`} className="between" style={{ fontSize: 13.5, padding: "5px 2px", gap: 10 }}>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>✦ {ct.title} <span className="muted">· {ct.clientName}</span></span>
                        <span style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{formatINRShort(ct.rev)} <span className="muted small">· {formatINRShort(ct.profit)} profit</span></span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
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
                  <Link key={trip.id} href={`/trips/${trip.id}`} className="up-trip">
                    <div className="between" style={{ marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{trip.name}</div>
                        <div className="small muted">{trip.destination || "—"} · {fmtDate(trip.departureDate)}</div>
                      </div>
                      <div className="right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{formatINRShort(f.revenue)}</div>
                          <div className="small muted">{trip.capacity > 0 ? `${f.pax}/${trip.capacity} seats` : `${f.pax} pax`}</div>
                        </div>
                        <span style={{ color: "var(--text-3)", fontSize: 18 }}>›</span>
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
