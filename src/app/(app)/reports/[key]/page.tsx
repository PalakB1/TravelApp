import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/org";
import {
  tripFinancials, bookingRevenue, bookingTotal, bookingPaid, bookingBalance,
  isActive, isNightGap, holdExpiringSoon, vendorCost, nightBookedRooms,
} from "@/lib/calc";
import { formatINR, formatINRShort } from "@/lib/money";
import { addBooking, addPayment, addVendorBooking } from "../../data-actions";
import AutoFill from "@/components/AutoFill";
import TableSearch from "@/components/TableSearch";

export const dynamic = "force-dynamic";

const KEYS = ["revenue", "cost", "profit", "outstanding", "attention"] as const;
type Key = (typeof KEYS)[number];
const META: Record<Key, { title: string; color: string; blurb: string }> = {
  revenue: { title: "Revenue booked", color: "c-emerald", blurb: "Every confirmed booking and what it earns (pre-tax)." },
  cost: { title: "Your cost", color: "c-amber", blurb: "Every hotel, car, driver and extra you pay for." },
  profit: { title: "Profit by trip", color: "c-violet", blurb: "Revenue minus your cost, trip by trip." },
  outstanding: { title: "Outstanding", color: "c-sky", blurb: "Bookings with a balance still due from customers." },
  attention: { title: "Needs attention", color: "c-rose", blurb: "Unbooked nights, expiring holds and coverage gaps." },
};

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default async function Report({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!KEYS.includes(key as Key)) notFound();
  const k = key as Key;
  const meta = META[k];
  const orgId = await requireOrgId();

  const trips = await prisma.trip.findMany({
    where: { orgId },
    include: {
      itinerary: { include: { hotels: true } },
      cars: true,
      vendorBookings: true,
      bookings: { include: { variant: true, payments: true } },
    },
    orderBy: [{ departureDate: "asc" }, { createdAt: "desc" }],
  });
  const customers = await prisma.customer.findMany({ where: { orgId }, select: { name: true, phone: true }, orderBy: { name: "asc" } });
  const phoneMap: Record<string, { phone?: string | null }> = {};
  for (const c of customers) if (c.phone) phoneMap[c.name.trim().toLowerCase()] = { phone: c.phone };

  const bookingRows = trips.flatMap((t) => t.bookings.filter((b) => isActive(b.status)).map((b) => ({ b, t })));

  const TripSelect = ({ name = "tripId" }: { name?: string }) => (
    <select name={name} required defaultValue={trips[0]?.id || ""}>
      {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="small muted"><Link href="/dashboard" style={{ color: "var(--text-2)" }}>← Dashboard</Link></div>
          <h1 style={{ marginTop: 6 }}>{meta.title}</h1>
          <p className="sub">{meta.blurb}</p>
        </div>
      </div>

      <datalist id="customer-list">
        {customers.map((c) => <option key={c.name} value={c.name} />)}
      </datalist>

      {/* ---------------- REVENUE ---------------- */}
      {k === "revenue" && (() => {
        const rows = [...bookingRows].sort((a, b) => +b.b.createdAt - +a.b.createdAt);
        const total = rows.reduce((s, r) => s + bookingRevenue(r.b), 0);
        return (
          <>
            <div className="metrics">
              <div className={`metric ${meta.color}`}><div className="label">Total revenue booked</div><div className="value">{formatINR(total)}</div><div className="foot">{rows.length} bookings</div></div>
            </div>
            <div className="card" style={{ padding: "16px 20px" }}>
              <TableSearch placeholder="Search this report…">
              <table className="t">
                <thead><tr><th style={{ paddingLeft: 20 }}>Booked on</th><th>Customer</th><th>Trip</th><th>Package</th><th className="num">Pax</th><th className="num">Revenue</th></tr></thead>
                <tbody>
                  {rows.length === 0 ? <tr><td colSpan={6} className="empty">No bookings yet.</td></tr> : rows.map(({ b, t }) => (
                    <tr key={b.id}>
                      <td className="muted small" style={{ paddingLeft: 20 }}>{fmtDate(b.createdAt)}</td>
                      <td><Link className="row-link" href={`/bookings/${b.id}`}>{b.customerName}</Link></td>
                      <td className="muted"><Link href={`/trips/${t.id}`} style={{ color: "var(--text-2)" }}>{t.name}</Link></td>
                      <td><span className="badge gray">{b.packageType}</span></td>
                      <td className="num">{b.pax}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{formatINR(bookingRevenue(b))}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && <tfoot><tr><td colSpan={5} style={{ paddingLeft: 20, fontWeight: 500 }}>Total</td><td className="num" style={{ fontWeight: 600 }}>{formatINR(total)}</td></tr></tfoot>}
              </table>
              </TableSearch>
            </div>
            <details className="card add" open={rows.length === 0}>
              <summary>+ Add a booking</summary>
              <div className="form-box">
                <form action={addBooking}>
                  <AutoFill sourceId="rep-name" fills={[{ targetId: "rep-phone", key: "phone" }]} data={phoneMap} />
                  <div className="row-3">
                    <label className="field"><span className="lbl">Trip</span><TripSelect /></label>
                    <label className="field"><span className="lbl">Lead name / party</span><input id="rep-name" name="customerName" list="customer-list" placeholder="Pick or type" required /></label>
                    <label className="field"><span className="lbl">Phone</span><input id="rep-phone" name="customerPhone" placeholder="98765 43210" /></label>
                  </div>
                  <div className="row-3">
                    <label className="field"><span className="lbl">Package</span>
                      <select name="packageType" defaultValue="land"><option value="land">Land only</option><option value="lva">Land + visa (LVA)</option><option value="full">Full (incl. flights)</option></select>
                    </label>
                    <label className="field"><span className="lbl">Travellers (pax)</span><input name="pax" type="number" min="1" defaultValue={1} /></label>
                    <label className="field"><span className="lbl">Status</span>
                      <select name="status" defaultValue="confirmed"><option value="enquiry">enquiry</option><option value="confirmed">confirmed</option><option value="travelled">travelled</option></select>
                    </label>
                  </div>
                  <div className="row-3">
                    <label className="field"><span className="lbl">Land cost</span><input name="landAmount" placeholder="₹" /></label>
                    <label className="field"><span className="lbl">Visa assistance</span><input name="visaAmount" placeholder="₹ (LVA / Full)" /></label>
                    <label className="field"><span className="lbl">Flights</span><input name="flightAmount" placeholder="₹ (Full)" /></label>
                  </div>
                  <div className="row-3">
                    <label className="field"><span className="lbl">Non-taxable amount</span><input name="nonTaxable" placeholder="visa/embassy fee" /></label>
                    <label className="field"><span className="lbl">Discount</span><input name="discount" placeholder="₹" /></label>
                    <label className="field"><span className="lbl">Discount reason</span><input name="discountReason" placeholder="optional" /></label>
                  </div>
                  <button className="primary sm" type="submit">Add booking</button>
                </form>
              </div>
            </details>
          </>
        );
      })()}

      {/* ---------------- OUTSTANDING ---------------- */}
      {k === "outstanding" && (() => {
        const rows = bookingRows.map((r) => ({ ...r, bal: bookingBalance(r.b) })).filter((r) => r.bal > 0).sort((a, b) => b.bal - a.bal);
        const total = rows.reduce((s, r) => s + r.bal, 0);
        return (
          <>
            <div className="metrics">
              <div className={`metric ${meta.color}`}><div className="label">Total outstanding</div><div className="value">{formatINR(total)}</div><div className="foot">{rows.length} bookings with a balance</div></div>
            </div>
            <div className="card" style={{ padding: "16px 20px" }}>
              <TableSearch placeholder="Search this report…">
              <table className="t">
                <thead><tr><th style={{ paddingLeft: 20 }}>Customer</th><th>Trip</th><th>Booked on</th><th className="num">Invoice</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
                <tbody>
                  {rows.length === 0 ? <tr><td colSpan={6} className="empty">Nothing outstanding — all clear.</td></tr> : rows.map(({ b, t, bal }) => (
                    <tr key={b.id}>
                      <td style={{ paddingLeft: 20 }}><Link className="row-link" href={`/bookings/${b.id}`}>{b.customerName}</Link></td>
                      <td className="muted"><Link href={`/trips/${t.id}`} style={{ color: "var(--text-2)" }}>{t.name}</Link></td>
                      <td className="muted small">{fmtDate(b.createdAt)}</td>
                      <td className="num">{formatINR(bookingTotal(b))}</td>
                      <td className="num">{formatINR(bookingPaid(b))}</td>
                      <td className="num"><span className="badge amber">{formatINR(bal)}</span></td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && <tfoot><tr><td colSpan={5} style={{ paddingLeft: 20, fontWeight: 500 }}>Total due</td><td className="num" style={{ fontWeight: 600 }}>{formatINR(total)}</td></tr></tfoot>}
              </table>
              </TableSearch>
            </div>
            <details className="card add" open={rows.length === 0 ? false : true}>
              <summary>+ Record a payment</summary>
              <div className="form-box">
                <form action={addPayment}>
                  <div className="row-3">
                    <label className="field"><span className="lbl">Booking</span>
                      <select name="bookingId" required defaultValue={rows[0]?.b.id || ""}>
                        {rows.map(({ b, t, bal }) => <option key={b.id} value={b.id}>{b.customerName} · {t.name} — {formatINRShort(bal)} due</option>)}
                      </select>
                    </label>
                    <label className="field"><span className="lbl">Amount</span><input name="amount" placeholder="40000 or 40k" required /></label>
                    <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
                  </div>
                  <div className="row-3">
                    <label className="field"><span className="lbl">Mode</span>
                      <select name="mode" defaultValue="upi"><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option><option value="other">Other</option></select>
                    </label>
                    <label className="field"><span className="lbl">Note</span><input name="note" placeholder="advance / installment" /></label>
                    <span />
                  </div>
                  <button className="primary sm" type="submit">Record payment</button>
                </form>
              </div>
            </details>
          </>
        );
      })()}

      {/* ---------------- COST ---------------- */}
      {k === "cost" && (() => {
        type Item = { type: string; detail: string; trip: string; tripId: string; date: Date | null; amount: number };
        const items: Item[] = [];
        for (const t of trips) {
          for (const n of t.itinerary) for (const h of n.hotels)
            if (h.cost) items.push({ type: "Hotel", detail: `${h.hotelName} · ${h.rooms} room${h.rooms === 1 ? "" : "s"} (${n.location})`, trip: t.name, tripId: t.id, date: n.date, amount: h.cost });
          for (const c of t.cars) {
            if (c.rentalCost) items.push({ type: "Car", detail: `${c.label}${c.carType ? " · " + c.carType : ""} rental`, trip: t.name, tripId: t.id, date: c.startDate, amount: c.rentalCost });
            if (c.driverMode === "hired" && c.driverCost) items.push({ type: "Driver", detail: `${c.label} hired driver`, trip: t.name, tripId: t.id, date: c.startDate, amount: c.driverCost });
          }
          for (const v of t.vendorBookings) items.push({ type: "Extra", detail: `${v.vendorName}${v.detail ? " · " + v.detail : ""}`, trip: t.name, tripId: t.id, date: v.date, amount: vendorCost(v) });
        }
        items.sort((a, b) => (b.date ? +b.date : 0) - (a.date ? +a.date : 0));
        const total = items.reduce((s, i) => s + i.amount, 0);
        const badge: Record<string, string> = { Hotel: "accent", Car: "gray", Driver: "amber", Extra: "green" };
        return (
          <>
            <div className="metrics">
              <div className={`metric ${meta.color}`}><div className="label">Total cost</div><div className="value">{formatINR(total)}</div><div className="foot">{items.length} line items</div></div>
            </div>
            <div className="card" style={{ padding: "16px 20px" }}>
              <TableSearch placeholder="Search this report…">
              <table className="t">
                <thead><tr><th style={{ paddingLeft: 20 }}>Type</th><th>Detail</th><th>Trip</th><th>Date</th><th className="num">Cost</th></tr></thead>
                <tbody>
                  {items.length === 0 ? <tr><td colSpan={5} className="empty">No costs recorded yet.</td></tr> : items.map((i, idx) => (
                    <tr key={idx}>
                      <td style={{ paddingLeft: 20 }}><span className={`badge ${badge[i.type] || "gray"}`}>{i.type}</span></td>
                      <td>{i.detail}</td>
                      <td className="muted"><Link href={`/trips/${i.tripId}`} style={{ color: "var(--text-2)" }}>{i.trip}</Link></td>
                      <td className="muted small">{fmtDate(i.date)}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{formatINR(i.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                {items.length > 0 && <tfoot><tr><td colSpan={4} style={{ paddingLeft: 20, fontWeight: 500 }}>Total</td><td className="num" style={{ fontWeight: 600 }}>{formatINR(total)}</td></tr></tfoot>}
              </table>
              </TableSearch>
            </div>
            <p className="small muted" style={{ margin: "4px 2px 10px" }}>Hotels and cars are added on each trip page. Add a quick extra cost (fuel, parking, permits…) here:</p>
            <details className="card add">
              <summary>+ Add an extra cost</summary>
              <div className="form-box">
                <form action={addVendorBooking}>
                  <div className="row-3">
                    <label className="field"><span className="lbl">Trip</span><TripSelect /></label>
                    <label className="field"><span className="lbl">Type</span>
                      <select name="type" defaultValue="fuel"><option value="fuel">Fuel</option><option value="parking">Parking</option><option value="activity">Activity</option><option value="guide">Guide</option><option value="permit">Permit</option><option value="flight">Flight</option><option value="other">Other</option></select>
                    </label>
                    <label className="field"><span className="lbl">Vendor / name</span><input name="vendorName" placeholder="e.g. Shell, N1" required /></label>
                  </div>
                  <div className="row-3">
                    <label className="field"><span className="lbl">Planned cost</span><input name="cost" placeholder="₹ estimate" /></label>
                    <label className="field"><span className="lbl">Actual cost</span><input name="actualCost" placeholder="₹ after trip" /></label>
                    <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
                  </div>
                  <label className="field"><span className="lbl">Detail</span><input name="detail" placeholder="optional note" /></label>
                  <button className="primary sm" type="submit">Add cost</button>
                </form>
              </div>
            </details>
          </>
        );
      })()}

      {/* ---------------- PROFIT ---------------- */}
      {k === "profit" && (() => {
        const rows = trips.map((t) => ({ t, f: tripFinancials({ bookings: t.bookings, nights: t.itinerary, cars: t.cars, vendorBookings: t.vendorBookings, maxPerRoom: t.maxPerRoom }) }))
          .sort((a, b) => b.f.profit - a.f.profit);
        const rev = rows.reduce((s, r) => s + r.f.revenue, 0);
        const cost = rows.reduce((s, r) => s + r.f.cost, 0);
        const profit = rev - cost;
        return (
          <>
            <div className="metrics">
              <div className="metric c-emerald"><div className="label">Revenue</div><div className="value">{formatINR(rev)}</div></div>
              <div className="metric c-amber"><div className="label">Cost</div><div className="value">{formatINR(cost)}</div></div>
              <div className="metric c-violet"><div className="label">Profit</div><div className="value">{formatINR(profit)}</div><div className="foot">{rev > 0 ? Math.round((profit / rev) * 100) : 0}% margin</div></div>
            </div>
            <div className="card" style={{ padding: "16px 20px" }}>
              <TableSearch placeholder="Search this report…">
              <table className="t">
                <thead><tr><th style={{ paddingLeft: 20 }}>Trip</th><th>Dates</th><th className="num">Revenue</th><th className="num">Cost</th><th className="num">Profit</th><th className="num">Margin</th></tr></thead>
                <tbody>
                  {rows.length === 0 ? <tr><td colSpan={6} className="empty">No trips yet.</td></tr> : rows.map(({ t, f }) => (
                    <tr key={t.id}>
                      <td style={{ paddingLeft: 20 }}><Link className="row-link" href={`/trips/${t.id}`}>{t.name}</Link></td>
                      <td className="muted small">{fmtDate(t.departureDate)}</td>
                      <td className="num">{formatINR(f.revenue)}</td>
                      <td className="num">{formatINR(f.cost)}</td>
                      <td className="num" style={{ fontWeight: 600, color: "var(--emerald)" }}>{formatINR(f.profit)}</td>
                      <td className="num">{Math.round(f.margin * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && <tfoot><tr><td colSpan={2} style={{ paddingLeft: 20, fontWeight: 500 }}>Total</td><td className="num" style={{ fontWeight: 600 }}>{formatINR(rev)}</td><td className="num" style={{ fontWeight: 600 }}>{formatINR(cost)}</td><td className="num" style={{ fontWeight: 600 }}>{formatINR(profit)}</td><td className="num">{rev > 0 ? Math.round((profit / rev) * 100) : 0}%</td></tr></tfoot>}
              </table>
              </TableSearch>
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>Profit moves when you add bookings (revenue) or hotels, cars and extras (cost) — open a trip to edit, or use the Revenue and Cost reports.</p>
          </>
        );
      })()}

      {/* ---------------- ATTENTION ---------------- */}
      {k === "attention" && (() => {
        type Alert = { tripId: string; tripName: string; text: string; kind: "gap" | "hold" };
        const alerts: Alert[] = [];
        for (const t of trips) {
          const f = tripFinancials({ bookings: t.bookings, nights: t.itinerary, cars: t.cars, vendorBookings: t.vendorBookings, maxPerRoom: t.maxPerRoom });
          for (const n of t.itinerary) {
            if (isNightGap(n)) {
              alerts.push({ tripId: t.id, tripName: t.name, kind: "gap", text: `No hotel in ${n.location}${n.date ? " · " + fmtDate(n.date) : ""}` });
            } else if (f.roomsNeeded > 0 && nightBookedRooms(n) < f.roomsNeeded) {
              alerts.push({ tripId: t.id, tripName: t.name, kind: "gap", text: `${n.location}${n.date ? " · " + fmtDate(n.date) : ""} — only ${nightBookedRooms(n)}/${f.roomsNeeded} rooms booked` });
            }
            for (const h of n.hotels) if (holdExpiringSoon(h.status, h.holdUntil)) alerts.push({ tripId: t.id, tripName: t.name, kind: "hold", text: `${h.hotelName} (${n.location}) hold ends ${fmtDate(h.holdUntil)}${h.source ? " · " + h.source : ""}` });
          }
          for (const c of t.cars) if (holdExpiringSoon(c.status, c.holdUntil)) alerts.push({ tripId: t.id, tripName: t.name, kind: "hold", text: `${c.label} hold ends ${fmtDate(c.holdUntil)}${c.source ? " · " + c.source : ""}` });
          if (f.seatsShort > 0) alerts.push({ tripId: t.id, tripName: t.name, kind: "gap", text: `${f.seatsShort} traveller${f.seatsShort > 1 ? "s" : ""} without a car seat — ${f.carSeats} seats for ${f.pax}` });
        }
        return (
          <>
            <div className="metrics">
              <div className={`metric ${alerts.length > 0 ? meta.color : "c-emerald"}`}><div className="label">Open items</div><div className="value">{alerts.length}</div><div className="foot">{alerts.filter((a) => a.kind === "gap").length} gaps · {alerts.filter((a) => a.kind === "hold").length} holds expiring</div></div>
            </div>
            <div className="card">
              {alerts.length === 0 ? <div className="empty">All clear — nothing needs attention.</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alerts.map((a, i) => (
                    <Link key={i} href={`/trips/${a.tripId}`} className="between" style={{ padding: "10px 13px", borderRadius: 8, background: a.kind === "gap" ? "var(--danger-bg)" : "var(--warning-bg)" }}>
                      <span style={{ fontSize: 13.5, color: a.kind === "gap" ? "var(--danger)" : "var(--warning)" }}>{a.text}</span>
                      <span className="small muted">{a.tripName} ›</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        );
      })()}
    </>
  );
}
