import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { tripFinancials, bookingTotal, bookingPaid, bookingBalance, isNightGap, holdExpiringSoon, carCost, pricePerRoom, nightCost, nightBookedRooms, carPassengerSeats } from "@/lib/calc";
import { formatINR, formatINRShort } from "@/lib/money";
import {
  addVariant, deleteVariant,
  addVendorBooking, updateVendorBooking, deleteVendorBooking,
  addBooking, deleteTrip,
  addNight, updateNight, deleteNight,
  addHotelBooking, updateHotelBooking, deleteHotelBooking,
  addCar, updateCar, deleteCar,
  addInclusion, updateInclusion, deleteInclusion,
  deleteVisaApplicant,
  duplicateTrip, updateTripRooms, renameTrip,
} from "../../data-actions";
import InlineTitle from "@/components/InlineTitle";
import ImportItinerary from "@/components/ImportItinerary";
import CloseDetails from "@/components/CloseDetails";
import AutoFill from "@/components/AutoFill";
import VisaLinkBuilder from "@/components/VisaLinkBuilder";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
function dateInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}
function statusBadge(s: string) {
  const map: Record<string, string> = { confirmed: "green", travelled: "accent", enquiry: "amber", cancelled: "red", final: "green", hold: "amber", paid: "green", pending: "amber", unbooked: "red" };
  return <span className={`badge ${map[s] || "gray"}`}>{s}</span>;
}

// A single completeness bar — nudges the user to finish filling a trip.
function Prog({ label, done, total, color, money, unit }: { label: string; done: number; total: number; color: string; money?: boolean; unit?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const complete = total > 0 && done >= total;
  const left = Math.max(0, total - done);
  return (
    <div className="prog">
      <div className="ptop">
        <span className="plabel">{label}</span>
        <span className={`pcount ${complete ? "pdone" : ""}`}>{money ? `${formatINRShort(done)} / ${formatINRShort(total)}` : `${done} / ${total}`}{complete ? " ✓" : ""}</span>
      </div>
      <div className="bar lg"><span className={color} style={{ width: `${pct}%` }} /></div>
      <div className="pfoot">{total === 0 ? "nothing to do yet" : complete ? "all done 🎉" : money ? `${pct}% collected` : `${pct}% · ${left} ${unit || ""} to go`}</div>
    </div>
  );
}

export default async function TripDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await requireScope();
  const trip = await prisma.trip.findFirst({
    where: { AND: [{ id }, scope.tripWhere] },
    include: {
      variants: { orderBy: { sellPrice: "desc" } },
      vendorBookings: { orderBy: { createdAt: "asc" } },
      itinerary: { orderBy: { order: "asc" }, include: { hotels: { orderBy: { createdAt: "asc" } } } },
      cars: { orderBy: { createdAt: "asc" } },
      inclusions: { orderBy: { createdAt: "asc" } },
      visaApplicants: { orderBy: { createdAt: "desc" } },
      bookings: { include: { variant: true, payments: true, travellers: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!trip) notFound();

  const f = tripFinancials({ bookings: trip.bookings, nights: trip.itinerary, cars: trip.cars, vendorBookings: trip.vendorBookings, maxPerRoom: trip.maxPerRoom });

  // hotel names already used, for the "pick or type new" dropdown
  const known = await prisma.hotelBooking.findMany({ where: { night: scope.viaTrip }, distinct: ["hotelName"], select: { hotelName: true }, orderBy: { hotelName: "asc" } });
  const customers = await prisma.customer.findMany({ where: { orgId: scope.orgId }, select: { name: true, phone: true }, orderBy: { name: "asc" } });
  const customerPhoneMap: Record<string, { phone?: string | null }> = {};
  for (const c of customers) if (c.phone) customerPhoneMap[c.name.trim().toLowerCase()] = { phone: c.phone };

  // Distinct "booked / held on" sources used before (Booking.com, Agoda, a vendor…) — pick or type new.
  const [hotelSources, carSources] = await Promise.all([
    prisma.hotelBooking.findMany({ where: { source: { not: null }, night: scope.viaTrip }, distinct: ["source"], select: { source: true } }),
    prisma.car.findMany({ where: { source: { not: null }, ...scope.viaTrip }, distinct: ["source"], select: { source: true } }),
  ]);
  const sources = [...new Set([...hotelSources, ...carSources].map((s) => (s.source || "").trim()).filter(Boolean))].sort();

  // Car "catalog" — every car type used before, so picking it re-fills seats/price/driver cost.
  const pastCars = await prisma.car.findMany({ where: { carType: { not: null }, ...scope.viaTrip }, orderBy: { createdAt: "desc" }, select: { carType: true, seats: true, rentalCost: true, driverCost: true, vendor: true } });
  const carCatalog: Record<string, { seats?: number; rentalCost?: number; driverCost?: number; vendor?: string | null }> = {};
  const carTypes: string[] = [];
  for (const c of pastCars) {
    const k = (c.carType || "").trim().toLowerCase();
    if (!k || k in carCatalog) continue;
    carCatalog[k] = { seats: c.seats || undefined, rentalCost: c.rentalCost || undefined, driverCost: c.driverCost || undefined, vendor: c.vendor };
    carTypes.push(c.carType!.trim());
  }

  const coreNightCount = trip.itinerary.filter((n) => !n.extra).length;
  const allHotels = trip.itinerary.flatMap((n) => n.hotels);
  const totalRooms = allHotels.reduce((s, h) => s + h.rooms, 0);
  const avgPerRoom = totalRooms > 0 ? Math.round(f.hotelCost / totalRooms) : 0;
  const avgPerNight = trip.itinerary.length > 0 ? Math.round(f.hotelCost / trip.itinerary.length) : 0;

  const dateRange = trip.departureDate
    ? `${fmtDate(trip.departureDate)}${trip.endDate ? " – " + fmtDate(trip.endDate) : ""}`
    : "No dates set";

  return (
    <>
      <datalist id="hotel-list">
        {known.map((h) => <option key={h.hotelName} value={h.hotelName} />)}
      </datalist>
      <datalist id="customer-list">
        {customers.map((c) => <option key={c.name} value={c.name} />)}
      </datalist>
      <datalist id="car-type-list">
        {carTypes.map((t) => <option key={t} value={t} />)}
      </datalist>
      <datalist id="source-list">
        {sources.map((s) => <option key={s} value={s} />)}
      </datalist>

      <div className="page-head">
        <div>
          <div className="small muted"><Link href="/trips" style={{ color: "var(--text-2)" }}>← Trips</Link></div>
          <h1 style={{ marginTop: 6 }}><InlineTitle action={renameTrip} id={trip.id} value={trip.name} /></h1>
          <p className="sub">{trip.destination || "—"} · {dateRange} · {coreNightCount} nights · {f.pax} travellers{f.hiredDrivers > 0 ? ` + ${f.hiredDrivers} driver${f.hiredDrivers > 1 ? "s" : ""} = ${f.totalPeople} total` : ""} · {trip.cars.length} cars</p>
        </div>
        <div className="flex" style={{ gap: 8, alignItems: "flex-start" }}>
          <details className="menu-pop" style={{ position: "relative" }}>
            <summary className="btn sm" style={{ listStyle: "none", cursor: "pointer" }}>Copy for new dates</summary>
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 360, maxWidth: "80vw", zIndex: 30, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 32px rgba(27,28,43,0.16)", padding: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 10 }}>Run this itinerary on new dates</div>
              <form action={duplicateTrip}>
                <input type="hidden" name="id" value={trip.id} />
                <label className="field"><span className="lbl">New departure date</span><input name="departureDate" type="date" /></label>
                <label className="field"><span className="lbl">New trip name</span><input name="name" placeholder={`${trip.name} (copy)`} /></label>
                <button className="primary sm" type="submit" style={{ marginTop: 4 }}>Duplicate trip</button>
                <p className="small muted" style={{ margin: "10px 0 0" }}>
                  Copies the {trip.itinerary.length} itinerary stops and your pricing, shifting every date to the new departure. Hotels, cars and bookings are <b>not</b> copied — add them fresh for the new trip.
                </p>
              </form>
            </div>
          </details>
          <details className="menu-pop" style={{ position: "relative" }}>
            <summary className="btn sm" style={{ listStyle: "none", cursor: "pointer", color: "var(--danger)", borderColor: "var(--danger-bg)" }}>Delete trip</summary>
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 320, maxWidth: "80vw", zIndex: 30, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 32px rgba(27,28,43,0.16)", padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Delete “{trip.name}”?</div>
              <p className="small muted" style={{ margin: "0 0 12px" }}>
                This permanently removes the trip and its {trip.itinerary.length} nights, all hotels, {trip.cars.length} cars and {trip.bookings.length} booking{trip.bookings.length === 1 ? "" : "s"} (with their payments). This cannot be undone.
              </p>
              <details>
                <summary className="btn danger sm" style={{ listStyle: "none", cursor: "pointer" }}>Yes, I want to delete</summary>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  <p className="small" style={{ margin: "0 0 10px", color: "var(--danger)", fontWeight: 600 }}>Are you absolutely sure? There’s no undo.</p>
                  <form action={deleteTrip}>
                    <input type="hidden" name="id" value={trip.id} />
                    <button className="danger sm" type="submit">Delete this trip forever</button>
                  </form>
                </div>
              </details>
            </div>
          </details>
        </div>
      </div>

      <div className="metrics">
        <div className="metric c-emerald"><div className="label">Revenue</div><div className="value">{formatINR(f.revenue)}</div><div className="foot">+ GST/TCS {formatINRShort(f.taxCollected)} → billed {formatINRShort(f.invoiced)}</div></div>
        <div className="metric c-amber"><div className="label">Your cost{f.assumedRoomCost > 0 ? <span className="small muted" style={{ fontWeight: 400 }}> · assumed {formatINR(f.assumedCost)}</span> : null}</div><div className="value">{formatINR(f.cost)}</div><div className="foot">hotels {formatINR(f.hotelCost)} · cars {formatINR(f.carRental)}{f.driverCost > 0 ? ` · drivers ${formatINR(f.driverCost)}` : ""}{f.extrasCost > 0 ? ` · extras ${formatINR(f.extrasCost)}` : ""}{f.inclusionsCost > 0 ? ` · inclusions ${formatINR(f.inclusionsCost)}` : ""}{f.assumedRoomCost > 0 ? ` · +${formatINR(f.assumedRoomCost)} for ${f.roomNightsToBook} rooms to book (@ ${formatINR(f.avgRoomCost)})` : ""}</div></div>
        <div className="metric c-violet"><div className="label">Profit</div><div className="value">{formatINR(f.profit)}</div><div className="foot">{Math.round(f.margin * 100)}% margin{f.assumedRoomCost > 0 ? ` · assumed ${formatINR(f.assumedProfit)} (${Math.round(f.assumedMargin * 100)}%)` : ""}</div></div>
        <div className="metric c-sky"><div className="label">Outstanding</div><div className="value">{formatINR(f.outstanding)}</div><div className="foot">{formatINR(f.paid)} collected</div></div>
        <div className={`metric ${f.unbookedNights + f.expiringHolds + f.shortRoomNights > 0 ? "c-rose" : "c-emerald"}`}><div className="label">Needs attention</div><div className="value">{f.unbookedNights + f.expiringHolds + f.shortRoomNights}</div><div className="foot">{f.unbookedNights} unbooked · {f.shortRoomNights} short rooms · {f.expiringHolds} holds expiring</div></div>
      </div>

      {(trip.itinerary.length > 0 || trip.bookings.length > 0) && (() => {
        const roomNightsNeeded = f.roomsNeeded * coreNightCount;
        const roomNightsBooked = trip.itinerary.filter((n) => !n.extra).reduce((s, n) => s + Math.min(nightBookedRooms(n), f.roomsNeeded), 0);
        return (
          <div className="card">
            <div className="card-title">Trip setup <span className="small muted">how ready this trip is — fill the gaps to reach 100%</span></div>
            <div className="prog-strip">
              <Prog label="Hotels booked" done={roomNightsBooked} total={roomNightsNeeded} color="emerald" unit="room-nights" />
              <Prog label="Payments collected" done={f.paid} total={f.invoiced} color="" money />
            </div>
          </div>
        );
      })()}

      {trip.notes ? (
        <details className="card">
          <summary style={{ listStyle: "none", cursor: "pointer", fontWeight: 500 }}>Trip overview</summary>
          <p className="small" style={{ color: "var(--text-2)", whiteSpace: "pre-wrap", margin: "10px 0 0", lineHeight: 1.6 }}>{trip.notes}</p>
        </details>
      ) : null}

      {/* HOTELS — ROOMS PER NIGHT (one table; click a day to see its hotels) */}
      {trip.itinerary.length > 0 && (
        <details className="section" open>
          <summary>
            <span className="sec-title">Hotels — rooms per night</span>
            <span className="sec-hi" style={{ marginLeft: "auto", marginRight: 12 }}>
              needs {f.roomsNeeded}/night{f.driverRooms > 0 ? ` for ${f.pax} travellers + ${f.driverRooms} driver${f.driverRooms > 1 ? "s" : ""}` : ""}
              {f.shortRoomNights > 0 ? <span style={{ color: "var(--danger)" }}> · {f.shortRoomNights} short</span> : <span style={{ color: "var(--success)" }}> · all covered</span>}
            </span>
          </summary>
          <div className="sec-body" style={{ padding: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, padding: "14px 20px 6px" }}>
              <div style={{ background: "var(--sky-bg)", borderRadius: 10, padding: "10px 14px" }}>
                <div className="small" style={{ color: "#0277b6", fontWeight: 600 }}>Travellers</div>
                <div style={{ fontSize: 21, fontWeight: 600, color: "#0277b6" }}>{f.pax}</div>
              </div>
              <div style={{ background: "var(--amber-bg)", borderRadius: 10, padding: "10px 14px" }}>
                <div className="small" style={{ color: "#9a6109", fontWeight: 600 }}>Drivers</div>
                <div style={{ fontSize: 21, fontWeight: 600, color: "#9a6109" }}>{f.hiredDrivers}</div>
              </div>
              <div style={{ background: "var(--violet-bg)", borderRadius: 10, padding: "10px 14px" }}>
                <div className="small" style={{ color: "#6d28d9", fontWeight: 600 }}>Total people</div>
                <div style={{ fontSize: 21, fontWeight: 600, color: "#6d28d9" }}>{f.totalPeople}</div>
              </div>
              <div style={{ background: "var(--emerald-bg)", borderRadius: 10, padding: "10px 14px" }}>
                <div className="small" style={{ color: "#0b7a52", fontWeight: 600 }}>Rooms / night</div>
                <div style={{ fontSize: 21, fontWeight: 600, color: "#0b7a52" }}>{f.roomsNeeded}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "6px 20px 12px" }}>
              <span className="small muted">{totalRooms} rooms held · {formatINR(f.hotelCost)} · avg {formatINR(avgPerRoom)}/room · click a day to add / edit its hotels</span>
              <span className="flex" style={{ gap: 8 }}>
                <form action={updateTripRooms} className="inline-form">
                  <input type="hidden" name="id" value={trip.id} />
                  <span className="small muted">Guests / room</span>
                  <input name="maxPerRoom" type="number" min="1" max="6" defaultValue={trip.maxPerRoom} style={{ width: 54, padding: "5px 8px", fontSize: 13 }} />
                  <button className="sm" type="submit">Set</button>
                </form>
                <a className="btn sm" href={`/api/trips/${trip.id}/rooming`}>Export Excel</a>
              </span>
            </div>
            <div className="rpn-head">
              <span></span><span>Day</span><span>Date</span><span>Stay</span><span className="rpn-num">Req</span><span className="rpn-num">Booked</span><span className="rpn-num">To book</span>
            </div>
            {(() => {
              let totReq = 0, totBooked = 0, totLeft = 0;
              // Core itinerary days are Day 1..N; add-on nights keep that numbering
              // intact and read as "Day 1-1/-2" (before) or "Day N+1/+2" (after).
              const itin = trip.itinerary;
              const coreIdx = itin.map((n, i) => (n.extra ? -1 : i)).filter((i) => i >= 0);
              const coreDay = new Map<number, number>();
              coreIdx.forEach((idx, k) => coreDay.set(idx, k + 1));
              // Core itinerary nights are Day 1..N; add-on nights get no day number.
              const dayLabel = (i: number): string => (itin[i].extra ? "" : `Day ${coreDay.get(i)}`);
              const rows = trip.itinerary.map((n, i) => {
                const isExtra = n.extra;
                const booked = nightBookedRooms(n);
                const req = isExtra ? booked : f.roomsNeeded; // add-on: required = whatever is booked
                const left = isExtra ? 0 : Math.max(0, req - booked); // add-on: to-book always 0
                if (!isExtra) { totReq += req; totLeft += left; }
                totBooked += booked;
                return (
                  <details className="rpn-day" key={n.id}>
                    <summary>
                      <span className="rpn-chev">▶</span>
                      <span className="small muted">{dayLabel(i)}</span>
                      <span className="small muted">{fmtDate(n.date)}</span>
                      <span style={{ fontWeight: 500, color: !isExtra && left > 0 ? "var(--danger)" : "var(--text)" }}>{n.location}{isExtra ? <span className="badge gray" style={{ marginLeft: 6 }}>add-on</span> : null}</span>
                      <span className="rpn-num" style={{ fontWeight: 500 }}>{req}</span>
                      <span className="rpn-num">{booked}</span>
                      <span className="rpn-num">{isExtra ? <span className="muted">0</span> : left > 0 ? <span className="badge red">{left} more</span> : <span className="badge green">✓</span>}</span>
                    </summary>
                    <div className="rpn-detail">
                      {!isExtra && n.hotels.length === 0 ? (
                        <div className="small" style={{ color: "var(--danger)", marginBottom: 8 }}>No hotel booked — need {req} room{req > 1 ? "s" : ""} this night. Add one below.</div>
                      ) : null}
                      {isExtra ? (
                        <div className="small muted" style={{ marginBottom: 8 }}>Add-on night (outside the core itinerary) — book as the customer needs; no room requirement.</div>
                      ) : null}
                      {n.hotels.map((h) => {
                        const expiring = holdExpiringSoon(h.status, h.holdUntil);
                        return (
                          <details key={h.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <summary style={{ listStyle: "none", cursor: "pointer", padding: "8px 0", display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{h.hotelName}</div>
                                <div className="small muted">{h.rooms} rooms · {formatINR(h.cost)}{h.rooms > 0 ? ` · ${formatINR(pricePerRoom(h))}/room` : ""}{h.source ? ` · ${h.source}` : ""}</div>
                                {h.notes ? <div className="small" style={{ color: "var(--text-3)" }}>{h.notes}</div> : null}
                              </div>
                              <div className="right">
                                {statusBadge(h.status)}
                                {h.status === "hold" && h.holdUntil ? <div className="small" style={{ color: expiring ? "var(--danger)" : "var(--warning)", marginTop: 3 }}>till {fmtDate(h.holdUntil)}{h.source ? ` · ${h.source}` : ""}</div> : null}
                              </div>
                            </summary>
                            <div className="form-box" style={{ marginBottom: 10 }}>
                              <form action={updateHotelBooking}>
                                <input type="hidden" name="id" value={h.id} />
                                <div className="row-3">
                                  <label className="field"><span className="lbl">Hotel</span><input name="hotelName" list="hotel-list" defaultValue={h.hotelName} /></label>
                                  <label className="field"><span className="lbl">Rooms</span><input name="rooms" type="number" min="0" defaultValue={h.rooms || ""} /></label>
                                  <label className="field"><span className="lbl">Total cost</span><input name="cost" defaultValue={h.cost || ""} placeholder="₹ e.g. 60k" /></label>
                                </div>
                                <div className="row-3">
                                  <label className="field"><span className="lbl">Status</span>
                                    <select name="status" defaultValue={h.status}><option value="unbooked">Not booked</option><option value="hold">On hold</option><option value="final">Confirmed</option></select>
                                  </label>
                                  <label className="field"><span className="lbl">Hold until</span><input name="holdUntil" type="date" defaultValue={dateInput(h.holdUntil)} /></label>
                                  <label className="field"><span className="lbl">Booked / held on</span><input name="source" list="source-list" defaultValue={h.source || ""} placeholder="Pick or type — Booking.com" /></label>
                                </div>
                                <div className="row">
                                  <label className="field"><span className="lbl">Confirmation #</span><input name="confirmationNo" defaultValue={h.confirmationNo || ""} placeholder="optional" /></label>
                                  <label className="field"><span className="lbl">Notes</span><input name="notes" defaultValue={h.notes || ""} placeholder="e.g. 2 triple rooms" /></label>
                                </div>
                                <div className="flex" style={{ gap: 8 }}>
                                  <button className="primary sm" type="submit">Save hotel</button>
                                  <CloseDetails label="Close" />
                                </div>
                              </form>
                              <form action={deleteHotelBooking}><input type="hidden" name="id" value={h.id} /><button className="sm danger" type="submit">Remove hotel</button></form>
                            </div>
                          </details>
                        );
                      })}

                      <details className="add">
                        <summary>+ Add hotel to this night</summary>
                        <div className="form-box">
                          <form action={addHotelBooking}>
                            <input type="hidden" name="nightId" value={n.id} />
                            <div className="row-3">
                              <label className="field"><span className="lbl">Hotel</span><input name="hotelName" list="hotel-list" placeholder="Pick or type a new hotel" required /></label>
                              <label className="field"><span className="lbl">Rooms</span><input name="rooms" type="number" min="0" placeholder="3" /></label>
                              <label className="field"><span className="lbl">Total cost</span><input name="cost" placeholder="60k" /></label>
                            </div>
                            <div className="row-3">
                              <label className="field"><span className="lbl">Status</span>
                                <select name="status" defaultValue="hold"><option value="unbooked">Not booked</option><option value="hold">On hold</option><option value="final">Confirmed</option></select>
                              </label>
                              <label className="field"><span className="lbl">Hold until</span><input name="holdUntil" type="date" /></label>
                              <label className="field"><span className="lbl">Booked / held on</span><input name="source" list="source-list" placeholder="Pick or type — Booking.com" /></label>
                            </div>
                            <label className="field"><span className="lbl">Notes</span><input name="notes" placeholder="e.g. 2 triple rooms" /></label>
                            <div className="flex" style={{ gap: 8 }}>
                              <button className="primary sm" type="submit">Add hotel</button>
                              <CloseDetails label="Cancel" />
                            </div>
                          </form>
                        </div>
                      </details>

                      <details className="add">
                        <summary style={{ color: "var(--text-2)" }}>Edit day plan / delete stop</summary>
                        <div className="form-box">
                          <form action={updateNight}>
                            <input type="hidden" name="id" value={n.id} />
                            <div className="row">
                              <label className="field"><span className="lbl">Date</span><input name="date" type="date" defaultValue={dateInput(n.date)} /></label>
                              <label className="field"><span className="lbl">Location</span><input name="location" defaultValue={n.location} /></label>
                            </div>
                            <label className="field"><span className="lbl">Day plan</span><textarea name="notes" rows={2} defaultValue={n.notes || ""} placeholder="What the group does this day" /></label>
                            <button className="primary sm" type="submit">Save stop</button>
                          </form>
                          <form action={deleteNight} style={{ marginTop: 8 }}><input type="hidden" name="id" value={n.id} /><button className="sm danger" type="submit">Delete stop</button></form>
                        </div>
                      </details>
                    </div>
                  </details>
                );
              });
              return (
                <>
                  {rows}
                  <div className="rpn-head" style={{ borderBottom: "none", borderTop: "1px solid var(--border)", textTransform: "none", fontSize: 13 }}>
                    <span></span>
                    <span style={{ gridColumn: "2 / 5", fontWeight: 600, color: "var(--text)" }}>Total room-nights</span>
                    <span className="rpn-num" style={{ fontWeight: 600, color: "var(--text)" }}>{totReq}</span>
                    <span className="rpn-num" style={{ fontWeight: 600, color: "var(--text)" }}>{totBooked}</span>
                    <span className="rpn-num" style={{ fontWeight: 600, color: totLeft > 0 ? "var(--danger)" : "var(--success)" }}>{totLeft > 0 ? `${totLeft} more` : "✓"}</span>
                  </div>
                </>
              );
            })()}
            <div style={{ padding: "14px 20px 18px", borderTop: "1px solid var(--border)" }}>
              <details className="add">
                <summary>+ Add a night, or re-import the Excel itinerary</summary>
                <div className="form-box">
                  <form action={addNight} style={{ marginBottom: 14 }}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <div className="row-3">
                      <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
                      <label className="field"><span className="lbl">Location (stay)</span><input name="location" placeholder="Selfoss" required /></label>
                      <label className="field"><span className="lbl">First hotel (optional)</span><input name="hotelName" list="hotel-list" placeholder="leave blank if not booked" /></label>
                    </div>
                    <div className="row-3">
                      <label className="field"><span className="lbl">Rooms</span><input name="rooms" type="number" min="0" placeholder="6" /></label>
                      <label className="field"><span className="lbl">Cost</span><input name="cost" placeholder="₹" /></label>
                      <label className="field"><span className="lbl">Status</span>
                        <select name="status" defaultValue="hold"><option value="unbooked">Not booked</option><option value="hold">On hold</option><option value="final">Confirmed</option></select>
                      </label>
                    </div>
                    <label className="field" style={{ maxWidth: 320 }}><span className="lbl">Type of night</span>
                      <select name="extra" defaultValue="no">
                        <option value="no">Itinerary night (counts toward rooms)</option>
                        <option value="yes">Add-on night — not part of itinerary (no room requirement)</option>
                      </select>
                    </label>
                    <button className="primary sm" type="submit">Add night</button>
                  </form>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <ImportItinerary tripId={trip.id} />
                  </div>
                </div>
              </details>
            </div>
          </div>
        </details>
      )}

      {/* Empty itinerary — just the importer */}
      {trip.itinerary.length === 0 && (
        <div className="card">
          <div className="card-title">Add the itinerary</div>
          <ImportItinerary tripId={trip.id} />
          <details className="add">
            <summary>+ Add a night manually</summary>
            <div className="form-box">
              <form action={addNight}>
                <input type="hidden" name="tripId" value={trip.id} />
                <div className="row-3">
                  <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
                  <label className="field"><span className="lbl">Location (stay)</span><input name="location" placeholder="Reykjavik" required /></label>
                  <label className="field"><span className="lbl">First hotel (optional)</span><input name="hotelName" list="hotel-list" placeholder="leave blank if not booked" /></label>
                </div>
                <label className="field" style={{ maxWidth: 320 }}><span className="lbl">Type of night</span>
                  <select name="extra" defaultValue="no">
                    <option value="no">Itinerary night (counts toward rooms)</option>
                    <option value="yes">Add-on night — not part of itinerary (no room requirement)</option>
                  </select>
                </label>
                <button className="primary sm" type="submit">Add night</button>
              </form>
            </div>
          </details>
        </div>
      )}

      {/* CARS */}
      <details className="section">
        <summary>
          <span className="sec-title">Car fleet</span>
          <span className="sec-hi" style={{ marginLeft: "auto", marginRight: 12 }}>
            {trip.cars.length} car{trip.cars.length !== 1 ? "s" : ""}{trip.cars.length > 0 ? ` · rental ${formatINR(f.carRental)}${f.driverCost > 0 ? ` + drivers ${formatINR(f.driverCost)}` : ""}` : ""}
            {f.carSeats > 0 ? <> · seats {f.carSeats} for {f.pax}{f.seatsShort > 0 ? <span style={{ color: "var(--danger)" }}> · {f.seatsShort} without a seat</span> : <span style={{ color: "var(--success)" }}> ✓</span>}</> : null}
          </span>
        </summary>
        <div className="sec-body">
        {trip.cars.length === 0 ? (
          <div className="empty">No cars yet. Add the cars for this self-drive trip.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
            {trip.cars.map((c) => {
              const expiring = holdExpiringSoon(c.status, c.holdUntil);
              return (
                <details key={c.id} className="form-box" style={{ padding: 0 }}>
                  <summary style={{ listStyle: "none", cursor: "pointer", padding: 14 }}>
                    <div className="between">
                      <div style={{ fontWeight: 500 }}>{c.label}{c.carType ? ` · ${c.carType}` : ""}</div>
                      {statusBadge(c.status)}
                    </div>
                    <div className="small" style={{ marginTop: 4, color: c.driverMode === "hired" ? "var(--accent)" : "var(--text-2)" }}>
                      {c.driverMode === "hired" ? `+ Hired driver · ${formatINR(c.driverCost)}${c.driverNeedsStay ? " · needs a room" : ""}` : "Client drives"}
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>Rental {formatINR(c.rentalCost)} · total {formatINR(carCost(c))}</div>
                    {c.seats > 0 ? <div className="small muted">{c.seats} seats · {carPassengerSeats(c)} for guests</div> : null}
                    {c.status === "hold" && c.holdUntil ? <div className="small" style={{ color: expiring ? "var(--danger)" : "var(--warning)", marginTop: 4 }}>hold till {fmtDate(c.holdUntil)}{c.source ? ` · ${c.source}` : ""}</div> : null}
                  </summary>
                  <div style={{ padding: "0 14px 14px" }}>
                    <form action={updateCar}>
                      <input type="hidden" name="id" value={c.id} />
                      <div className="row-3">
                        <label className="field"><span className="lbl">Car type</span><input name="carType" defaultValue={c.carType || ""} placeholder="Dacia Duster" /></label>
                        <label className="field"><span className="lbl">Seats (incl. driver)</span><input name="seats" type="number" min="0" defaultValue={c.seats || ""} placeholder="5" /></label>
                        <label className="field"><span className="lbl">Vendor</span><input name="vendor" defaultValue={c.vendor || ""} placeholder="Blue Car Rental" /></label>
                      </div>
                      <div className="row-3">
                        <label className="field"><span className="lbl">Rental cost</span><input name="rentalCost" defaultValue={c.rentalCost || ""} /></label>
                        <label className="field"><span className="lbl">Driver</span>
                          <select name="driverMode" defaultValue={c.driverMode}><option value="self">Client drives</option><option value="hired">Hired driver</option></select>
                        </label>
                        <label className="field"><span className="lbl">Driver cost</span><input name="driverCost" defaultValue={c.driverCost || ""} /></label>
                      </div>
                      <label className="field" style={{ maxWidth: 280 }}><span className="lbl">Driver needs a room? (if hired)</span>
                        <select name="driverNeedsStay" defaultValue={c.driverNeedsStay ? "yes" : "no"}><option value="no">No</option><option value="yes">Yes — book a room each night</option></select>
                      </label>
                      <div className="row-3">
                        <label className="field"><span className="lbl">Status</span>
                          <select name="status" defaultValue={c.status}><option value="hold">On hold</option><option value="final">Confirmed</option></select>
                        </label>
                        <label className="field"><span className="lbl">Hold until</span><input name="holdUntil" type="date" defaultValue={dateInput(c.holdUntil)} /></label>
                        <label className="field"><span className="lbl">Held on</span><input name="source" list="source-list" defaultValue={c.source || ""} placeholder="vendor / app" /></label>
                      </div>
                      <button className="primary sm" type="submit">Save car</button>
                    </form>
                    <form action={deleteCar} style={{ marginTop: 8 }}><input type="hidden" name="id" value={c.id} /><button className="sm danger" type="submit">Remove car</button></form>
                  </div>
                </details>
              );
            })}
          </div>
        )}
        <details className="add">
          <summary>+ Add car</summary>
          <div className="form-box">
            <form action={addCar}>
              <input type="hidden" name="tripId" value={trip.id} />
              <AutoFill sourceId="car-type" data={carCatalog} fills={[{ targetId: "car-seats", key: "seats" }, { targetId: "car-rental", key: "rentalCost" }, { targetId: "car-driver-cost", key: "driverCost" }, { targetId: "car-vendor", key: "vendor" }]} />
              {carTypes.length > 0 && <p className="small muted" style={{ margin: "0 0 10px" }}>💡 Pick a car you’ve used before to auto-fill seats, price &amp; driver cost — all still editable.</p>}
              <div className="row-3">
                <label className="field"><span className="lbl">Label</span><input name="label" placeholder={`Car ${trip.cars.length + 1}`} /></label>
                <label className="field"><span className="lbl">Car type</span><input id="car-type" name="carType" list="car-type-list" placeholder="Pick or type — Dacia Duster" /></label>
                <label className="field"><span className="lbl">Seats (incl. driver)</span><input id="car-seats" name="seats" type="number" min="0" placeholder="5 (4 guests + driver)" /></label>
              </div>
              <div className="row">
                <label className="field"><span className="lbl">Vendor</span><input id="car-vendor" name="vendor" placeholder="Blue Car Rental" /></label>
              </div>
              <div className="row-3">
                <label className="field"><span className="lbl">Rental cost</span><input id="car-rental" name="rentalCost" placeholder="₹" /></label>
                <label className="field"><span className="lbl">Driver</span>
                  <select name="driverMode" defaultValue="self"><option value="self">Client drives</option><option value="hired">Hired driver</option></select>
                </label>
                <label className="field"><span className="lbl">Driver cost</span><input id="car-driver-cost" name="driverCost" placeholder="₹ (if hired)" /></label>
              </div>
              <label className="field" style={{ maxWidth: 280 }}><span className="lbl">Driver needs a room? (if hired)</span>
                <select name="driverNeedsStay" defaultValue="no"><option value="no">No</option><option value="yes">Yes — book a room each night</option></select>
              </label>
              <div className="row-3">
                <label className="field"><span className="lbl">Status</span>
                  <select name="status" defaultValue="hold"><option value="hold">On hold</option><option value="final">Confirmed</option></select>
                </label>
                <label className="field"><span className="lbl">Hold until</span><input name="holdUntil" type="date" /></label>
                <label className="field"><span className="lbl">Held on</span><input name="source" list="source-list" placeholder="vendor / app" /></label>
              </div>
              <button className="primary sm" type="submit">Add car</button>
            </form>
          </div>
        </details>
        </div>
      </details>

      {/* INCLUSIONS */}
      <details className="section" open={trip.inclusions.length > 0}>
        <summary>
          <span className="sec-title">Inclusions &amp; extras</span>
          <span className="sec-hi" style={{ marginLeft: "auto", marginRight: 12 }}>
            {trip.inclusions.length} item{trip.inclusions.length !== 1 ? "s" : ""}
            {trip.inclusions.filter((i) => i.isDefault).length > 0 ? ` · ${trip.inclusions.filter((i) => i.isDefault).length} default` : ""}
          </span>
        </summary>
        <div className="sec-body">
          <p className="small muted" style={{ margin: "0 0 12px" }}>Defaults are auto-ticked on every new booking (your cost only). Optional ones are upsells you tick per customer (cost + charge). Prices are per person.</p>
          {trip.inclusions.length === 0 ? (
            <div className="empty small">None yet. Add whale watching, blue lagoon, etc. below.</div>
          ) : (
            <div className="stack" style={{ marginBottom: 14 }}>
              {trip.inclusions.map((inc) => (
                <details key={inc.id} className="add" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", margin: 0 }}>
                  <summary style={{ listStyle: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 500 }}>{inc.name}</span>
                    {inc.isDefault ? <span className="badge green">default</span> : <span className="badge gray">optional</span>}
                    {inc.taxable ? <span className="badge sky">GST/TCS</span> : <span className="badge gray">no tax</span>}
                    <span className="small muted" style={{ marginLeft: "auto" }}>cost {formatINR(inc.cost)}/pp{!inc.isDefault ? ` · charge ${formatINR(inc.sellContribution)}/pp` : ""}</span>
                  </summary>
                  <div className="form-box" style={{ marginTop: 10 }}>
                    <form action={updateInclusion}>
                      <input type="hidden" name="id" value={inc.id} />
                      <div className="row-3">
                        <label className="field"><span className="lbl">Name</span><input name="name" defaultValue={inc.name} /></label>
                        <label className="field"><span className="lbl">On every booking?</span>
                          <select name="isDefault" defaultValue={inc.isDefault ? "yes" : "no"}><option value="yes">Default (cost only)</option><option value="no">Optional upsell</option></select>
                        </label>
                        <label className="field"><span className="lbl">GST + TCS?</span>
                          <select name="taxable" defaultValue={inc.taxable ? "yes" : "no"}><option value="yes">Yes</option><option value="no">No</option></select>
                        </label>
                      </div>
                      <div className="row-3">
                        <label className="field"><span className="lbl">Your cost / person</span><input name="cost" defaultValue={inc.cost || ""} /></label>
                        <label className="field"><span className="lbl">Customer charge / person</span><input name="charge" defaultValue={inc.sellContribution || ""} placeholder="optional only" /></label>
                        <div className="flex" style={{ alignItems: "flex-end", paddingBottom: 12, gap: 8 }}>
                          <button className="primary sm" type="submit">Save</button>
                        </div>
                      </div>
                    </form>
                    <form action={deleteInclusion} style={{ marginTop: 4 }}><input type="hidden" name="id" value={inc.id} /><button className="sm danger" type="submit">Delete inclusion</button></form>
                    <p className="small muted" style={{ margin: "8px 0 0" }}>Editing the price only affects future selections — bookings that already have it keep their snapshotted price.</p>
                  </div>
                </details>
              ))}
            </div>
          )}
          <details className="add">
            <summary>+ Add inclusion</summary>
            <div className="form-box">
              <form action={addInclusion}>
                <input type="hidden" name="tripId" value={trip.id} />
                <div className="row-3">
                  <label className="field"><span className="lbl">Name</span><input name="name" placeholder="Whale watching" required /></label>
                  <label className="field"><span className="lbl">On every booking?</span>
                    <select name="isDefault" defaultValue="no"><option value="no">Optional upsell</option><option value="yes">Default — auto-added (cost only)</option></select>
                  </label>
                  <label className="field"><span className="lbl">GST + TCS on charge?</span>
                    <select name="taxable" defaultValue="yes"><option value="yes">Yes</option><option value="no">No</option></select>
                  </label>
                </div>
                <div className="row">
                  <label className="field"><span className="lbl">Your cost / person</span><input name="cost" placeholder="10000 or 10k" /></label>
                  <label className="field"><span className="lbl">Customer charge / person</span><input name="charge" placeholder="₹ (optional upsells only)" /></label>
                </div>
                <button className="primary sm" type="submit">Add inclusion</button>
              </form>
            </div>
          </details>
        </div>
      </details>

      {/* VISA */}
      <details className="section">
        <summary>
          <span className="sec-title">Visa forms</span>
          <span className="sec-hi" style={{ marginLeft: "auto", marginRight: 12 }}>{trip.visaApplicants.length} submitted</span>
        </summary>
        <div className="sec-body">
          <div className="form-box" style={{ marginBottom: 14 }}>
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>🔗 Visa form link — pick the visa type, then share with every traveller on this trip</div>
            <VisaLinkBuilder tripId={trip.id} tripName={trip.name} />
            <p className="small muted" style={{ margin: "8px 0 0" }}>Each traveller fills it once; they instantly get a cover letter + document checklist (print/PDF), and a submission appears below.</p>
          </div>
          {trip.visaApplicants.length === 0 ? (
            <div className="empty small">No visa forms filled yet.</div>
          ) : (
            <table className="t">
              <thead><tr><th>Applicant</th><th>Passport</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
              <tbody>
                {trip.visaApplicants.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500 }}><Link className="row-link" href={`/visas/${v.id}`}>{v.fullName}</Link></td>
                    <td className="muted small">{v.passportNo || "—"}</td>
                    <td>{statusBadge(v.status)}</td>
                    <td className="muted small">{fmtDate(v.createdAt)}</td>
                    <td className="num">
                      <span className="flex" style={{ justifyContent: "flex-end", gap: 6 }}>
                        <Link className="btn sm" href={`/visas/${v.id}`}>Details & letter →</Link>
                        <form action={deleteVisaApplicant}><input type="hidden" name="id" value={v.id} /><button className="sm danger" type="submit" aria-label="Delete">✕</button></form>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </details>

      {/* BOOKINGS */}
      <div className="card">
        <div className="card-title">Bookings</div>
        {trip.bookings.length === 0 ? (
          <div className="empty-cta">
            <span className="emoji">🧳</span>
            <div className="t">No bookings yet</div>
            <div className="d">Add your first party to start tracking revenue, payments and travellers for this trip.</div>
            <span className="btn primary sm" style={{ pointerEvents: "none" }}>↓ Add a booking below</span>
          </div>
        ) : (
          <table className="t">
            <thead><tr><th>Party</th><th>Pax</th><th>Status</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {trip.bookings.map((b) => {
                const bal = bookingBalance(b);
                return (
                  <tr key={b.id}>
                    <td><Link className="row-link" href={`/bookings/${b.id}`}>{b.customerName}</Link>
                      {b.discount > 0 ? <div className="small muted">−{formatINR(b.discount)} {b.discountReason || "discount"}</div> : null}</td>
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
        )}
        <details className="add">
          <summary>+ Add booking</summary>
          <div className="form-box">
            <form action={addBooking}>
              <input type="hidden" name="tripId" value={trip.id} />
              <AutoFill sourceId="bk-name" fills={[{ targetId: "bk-phone", key: "phone" }]} data={customerPhoneMap} />
              <div className="row-3">
                <label className="field"><span className="lbl">Lead name / party</span><input id="bk-name" name="customerName" list="customer-list" placeholder="Pick or type a customer" required /></label>
                <label className="field"><span className="lbl">Phone</span><input id="bk-phone" name="customerPhone" placeholder="98765 43210" /></label>
                <label className="field"><span className="lbl">Package</span>
                  <select name="packageType" defaultValue="land"><option value="land">Land only</option><option value="lva">Land + visa (LVA)</option><option value="full">Full (incl. flights)</option></select>
                </label>
              </div>
              <div className="row-3">
                <label className="field"><span className="lbl">Land cost</span><input name="landAmount" placeholder="₹" /></label>
                <label className="field"><span className="lbl">Visa assistance</span><input name="visaAmount" placeholder="₹ (LVA / Full)" /></label>
                <label className="field"><span className="lbl">Flights</span><input name="flightAmount" placeholder="₹ (Full only)" /></label>
              </div>
              <div className="row-3">
                <label className="field"><span className="lbl">Travellers (pax)</span><input name="pax" type="number" min="1" defaultValue={1} /></label>
                <label className="field"><span className="lbl">Discount</span><input name="discount" placeholder="₹ or 5k" /></label>
                <label className="field"><span className="lbl">Discount reason</span><input name="discountReason" placeholder="early bird" /></label>
              </div>
              <div className="row-3">
                <label className="field"><span className="lbl">Non-taxable amount</span><input name="nonTaxable" placeholder="embassy fee, no GST/TCS" /></label>
                <label className="field"><span className="lbl">GST %</span><input name="gstRate" type="number" min="0" step="0.01" defaultValue={5} /></label>
                <label className="field"><span className="lbl">TCS %</span><input name="tcsRate" type="number" min="0" step="0.01" defaultValue={2} /></label>
              </div>
              <label className="field"><span className="lbl">Status</span>
                <select name="status" defaultValue="confirmed" style={{ maxWidth: 220 }}><option value="enquiry">enquiry</option><option value="confirmed">confirmed</option><option value="travelled">travelled</option></select>
              </label>
              <button className="primary sm" type="submit">Add booking</button>
            </form>
          </div>
        </details>
      </div>

      {/* PRICING + EXTRAS */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Per-person pricing (optional)</div>
          {trip.variants.length === 0 ? (
            <div className="empty small">Add a price-per-person here if you sell a standard rate. Otherwise set a price on each booking.</div>
          ) : (
            <table className="t">
              <thead><tr><th>Variant</th><th className="num">Per person</th><th></th></tr></thead>
              <tbody>
                {trip.variants.map((v) => (
                  <tr key={v.id}>
                    <td>{v.name}<div className="small muted">{v.occupancy || ""}</div></td>
                    <td className="num" style={{ fontWeight: 500 }}>{formatINR(v.sellPrice)}</td>
                    <td className="num"><form action={deleteVariant}><input type="hidden" name="id" value={v.id} /><button className="sm" type="submit" aria-label="Delete">✕</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <details className="add">
            <summary>+ Add price</summary>
            <div className="form-box">
              <form action={addVariant}>
                <input type="hidden" name="tripId" value={trip.id} />
                <div className="row">
                  <label className="field"><span className="lbl">Name</span><input name="name" placeholder="Standard" required /></label>
                  <label className="field"><span className="lbl">Per person</span><input name="sellPrice" placeholder="₹" /></label>
                </div>
                <button className="primary sm" type="submit">Add</button>
              </form>
            </div>
          </details>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Extras &amp; other suppliers</span>
            {trip.vendorBookings.length > 0 ? <span className="small muted" style={{ fontWeight: 400 }}>planned {formatINR(f.extrasPlanned)} · actual {formatINR(f.extrasActual)}</span> : null}
          </div>
          {trip.vendorBookings.length === 0 ? (
            <div className="empty small">Fuel, parking, activities, permits, guides — anything else you pay for. Add a planned estimate now, fill the actual after the trip.</div>
          ) : (
            <table className="t">
              <thead><tr><th>Item</th><th>Status</th><th className="num">Planned</th><th className="num">Actual</th><th></th></tr></thead>
              <tbody>
                {trip.vendorBookings.map((vb) => (
                  <tr key={vb.id}>
                    <td>
                      <form action={updateVendorBooking} id={`vb-${vb.id}`}><input type="hidden" name="id" value={vb.id} /></form>
                      {vb.vendorName}<div className="small muted">{vb.type}{vb.detail ? ` · ${vb.detail}` : ""}</div>
                    </td>
                    <td>
                      <select name="status" form={`vb-${vb.id}`} defaultValue={vb.status} style={{ width: 108, padding: "5px 8px", fontSize: 13 }}>
                        <option value="pending">pending</option><option value="confirmed">confirmed</option><option value="paid">paid</option>
                      </select>
                    </td>
                    <td className="num"><input name="cost" form={`vb-${vb.id}`} defaultValue={vb.cost || ""} placeholder="₹" style={{ width: 92, padding: "5px 8px", fontSize: 13, textAlign: "right" }} /></td>
                    <td className="num"><input name="actualCost" form={`vb-${vb.id}`} defaultValue={vb.actualCost ?? ""} placeholder="—" style={{ width: 92, padding: "5px 8px", fontSize: 13, textAlign: "right" }} /></td>
                    <td className="num">
                      <span className="flex" style={{ justifyContent: "flex-end", gap: 6 }}>
                        <button className="sm" type="submit" form={`vb-${vb.id}`}>Save</button>
                        <form action={deleteVendorBooking}><input type="hidden" name="id" value={vb.id} /><button className="sm" type="submit" aria-label="Delete">✕</button></form>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <details className="add">
            <summary>+ Add extra</summary>
            <div className="form-box">
              <form action={addVendorBooking}>
                <input type="hidden" name="tripId" value={trip.id} />
                <div className="row-3">
                  <label className="field"><span className="lbl">Type</span>
                    <select name="type" defaultValue="fuel"><option value="fuel">Fuel</option><option value="parking">Parking</option><option value="activity">Activity</option><option value="guide">Guide</option><option value="permit">Permit</option><option value="flight">Flight</option><option value="other">Other</option></select>
                  </label>
                  <label className="field"><span className="lbl">Name</span><input name="vendorName" placeholder="Fuel for convoy" required /></label>
                  <label className="field"><span className="lbl">Status</span>
                    <select name="status" defaultValue="pending"><option value="pending">pending</option><option value="confirmed">confirmed</option><option value="paid">paid</option></select>
                  </label>
                </div>
                <div className="row-3">
                  <label className="field"><span className="lbl">Planned cost (estimate)</span><input name="cost" placeholder="₹ rough estimate" /></label>
                  <label className="field"><span className="lbl">Actual cost (after trip)</span><input name="actualCost" placeholder="leave blank for now" /></label>
                  <label className="field"><span className="lbl">Detail</span><input name="detail" placeholder="optional" /></label>
                </div>
                <button className="primary sm" type="submit">Add extra</button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
