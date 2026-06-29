"use client";

import { useState } from "react";
import Combobox, { type ComboOption } from "./Combobox";
import {
  addPayment, addBooking, addHotelBooking, createCustomer, createTrip,
} from "@/app/(app)/data-actions";

type Props = {
  payable: ComboOption[];
  trips: { id: string; name: string }[];
  nightsByTrip: Record<string, { id: string; label: string }[]>;
  customerNames: string[];
  sources: string[];
};

const ACTIONS = [
  { key: "payment", label: "💸 Payment made" },
  { key: "booking", label: "🎫 New booking" },
  { key: "hotel", label: "🏨 Book hotel" },
  { key: "customer", label: "🧑 Add customer" },
  { key: "trip", label: "🗺️ New trip" },
] as const;
type ActionKey = (typeof ACTIONS)[number]["key"];

export default function QuickEntry({ payable, trips, nightsByTrip, customerNames, sources }: Props) {
  const [action, setAction] = useState<ActionKey>("payment");
  const [hotelTrip, setHotelTrip] = useState(trips[0]?.id || "");
  // Client runtime — fine to read the clock here (defaults the date to today).
  const today = new Date().toISOString().slice(0, 10);

  const nights = nightsByTrip[hotelTrip] || [];

  return (
    <div>
      <div className="flex" style={{ gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {ACTIONS.map((a) => (
          <button key={a.key} type="button" className={`chip ${action === a.key ? "chip-on" : ""}`} onClick={() => setAction(a.key)}>
            {a.label}
          </button>
        ))}
      </div>

      {/* PAYMENT */}
      {action === "payment" && (
        <form action={addPayment} key="payment">
          <datalist id="qe-customers">{customerNames.map((n) => <option key={n} value={n} />)}</datalist>
          <label className="field"><span className="lbl">Who paid?</span>
            {payable.length === 0
              ? <input disabled placeholder="No bookings yet — add one first" />
              : <Combobox name="bookingId" placeholder="Type a customer name…" emptyHint="No match. Add their booking first." options={payable} />}
          </label>
          <div className="row-3">
            <label className="field"><span className="lbl">Amount</span><input name="amount" placeholder="40000 or 40k" required /></label>
            <label className="field"><span className="lbl">Mode</span>
              <select name="mode" defaultValue="upi"><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option><option value="other">Other</option></select>
            </label>
            <label className="field"><span className="lbl">Date</span><input name="date" type="date" defaultValue={today} /></label>
          </div>
          <button className="primary" type="submit" disabled={payable.length === 0}>Record payment</button>
        </form>
      )}

      {/* NEW BOOKING */}
      {action === "booking" && (
        <form action={addBooking} key="booking">
          <datalist id="qe-customers">{customerNames.map((n) => <option key={n} value={n} />)}</datalist>
          <div className="row">
            <label className="field"><span className="lbl">Trip · group</span>
              <select name="tripId" required defaultValue={trips[0]?.id || ""}>{trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </label>
            <label className="field"><span className="lbl">Lead name / party</span><input name="customerName" list="qe-customers" placeholder="Pick or type a customer" required /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Phone</span><input name="customerPhone" placeholder="98765 43210" /></label>
            <label className="field"><span className="lbl">Travellers (pax)</span><input name="pax" type="number" min="1" defaultValue={1} /></label>
            <label className="field"><span className="lbl">Package</span>
              <select name="packageType" defaultValue="land"><option value="land">Land only</option><option value="lva">Land + visa</option><option value="full">Full</option></select>
            </label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Land cost</span><input name="landAmount" placeholder="₹" /></label>
            <label className="field"><span className="lbl">Visa</span><input name="visaAmount" placeholder="₹ (if any)" /></label>
            <label className="field"><span className="lbl">Flights</span><input name="flightAmount" placeholder="₹ (if any)" /></label>
          </div>
          <button className="primary" type="submit">Add booking</button>
        </form>
      )}

      {/* BOOK HOTEL */}
      {action === "hotel" && (
        <form action={addHotelBooking} key="hotel">
          <datalist id="qe-source-list">{sources.map((s) => <option key={s} value={s} />)}</datalist>
          <div className="row">
            <label className="field"><span className="lbl">Trip</span>
              <select value={hotelTrip} onChange={(e) => setHotelTrip(e.target.value)}>{trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </label>
            <label className="field"><span className="lbl">Night (date · place)</span>
              {nights.length === 0
                ? <input disabled placeholder="This trip has no itinerary nights yet" />
                : <select name="nightId" required defaultValue="">{<option value="" disabled>Pick a night…</option>}{nights.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select>}
            </label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Hotel name</span><input name="hotelName" list="hotel-list" placeholder="Hotel name" required /></label>
            <label className="field"><span className="lbl">Rooms</span><input name="rooms" type="number" min="0" placeholder="3" /></label>
            <label className="field"><span className="lbl">Cost (total)</span><input name="cost" placeholder="₹" /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Status</span>
              <select name="status" defaultValue="hold"><option value="hold">On hold</option><option value="final">Confirmed</option><option value="unbooked">Not booked</option></select>
            </label>
            <label className="field"><span className="lbl">Hold until</span><input name="holdUntil" type="date" /></label>
            <label className="field"><span className="lbl">Booked on</span><input name="source" list="qe-source-list" placeholder="Pick or type — Booking.com" /></label>
          </div>
          <button className="primary" type="submit" disabled={nights.length === 0}>Add hotel</button>
        </form>
      )}

      {/* ADD CUSTOMER */}
      {action === "customer" && (
        <form action={createCustomer} key="customer">
          <div className="row-3">
            <label className="field"><span className="lbl">Name</span><input name="name" placeholder="Full name" required /></label>
            <label className="field"><span className="lbl">Phone</span><input name="phone" placeholder="98765 43210" /></label>
            <label className="field"><span className="lbl">Email</span><input name="email" type="email" placeholder="optional" /></label>
          </div>
          <button className="primary" type="submit">Add customer</button>
          <p className="small muted" style={{ margin: "10px 0 0" }}>Saves a contact you can book later. To bill them, use “New booking”.</p>
        </form>
      )}

      {/* NEW TRIP */}
      {action === "trip" && (
        <form action={createTrip} key="trip">
          <div className="row">
            <label className="field"><span className="lbl">Trip name</span><input name="name" placeholder="Iceland Ring Road — Mar" required /></label>
            <label className="field"><span className="lbl">Destination</span><input name="destination" placeholder="Iceland" /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Departure</span><input name="departureDate" type="date" /></label>
            <label className="field"><span className="lbl">End date</span><input name="endDate" type="date" /></label>
            <label className="field"><span className="lbl">Nights</span><input name="nights" type="number" min="0" placeholder="8" /></label>
          </div>
          <button className="primary" type="submit">Create trip</button>
        </form>
      )}
    </div>
  );
}
