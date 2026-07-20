"use client";

import { useState } from "react";
import Combobox, { type ComboOption } from "./Combobox";
import {
  addPayment, addBooking, addHotelStay, createCustomer, createTrip,
} from "@/app/(app)/data-actions";
import { addExpense } from "@/app/(app)/expenses/actions";

type Props = {
  payable: ComboOption[];
  trips: { id: string; name: string }[];
  customerNames: string[];
  sources: string[];
};

const ACTIONS = [
  { key: "payment", label: "💸 Payment made" },
  { key: "expense", label: "💰 Expense" },
  { key: "booking", label: "🎫 New booking" },
  { key: "hotel", label: "🏨 Book hotel" },
  { key: "customer", label: "🧑 Add customer" },
  { key: "trip", label: "🗺️ New trip" },
] as const;
type ActionKey = (typeof ACTIONS)[number]["key"];

const EXP_CATS: [string, string][] = [
  ["hotel", "Hotel / stay"], ["transport", "Transport / car"], ["flight", "Flight"], ["guide", "Guide / activity"],
  ["permit", "Permit / entry"], ["fuel", "Fuel / tolls"], ["visa", "Visa"], ["marketing", "Marketing / ads"],
  ["salary", "Salary / payroll"], ["office", "Office / rent"], ["software", "Software / tools"], ["tax", "Tax / govt"], ["misc", "Miscellaneous"],
];

export default function QuickEntry({ payable, trips, customerNames, sources }: Props) {
  const [action, setAction] = useState<ActionKey>("payment");
  // Client runtime — fine to read the clock here (defaults the date to today).
  const today = new Date().toISOString().slice(0, 10);

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

      {/* EXPENSE — money out; optionally tag it to a trip, attach the invoice */}
      {action === "expense" && (
        <form action={addExpense} key="expense">
          <div className="row-3">
            <label className="field"><span className="lbl">Which trip?</span>
              <select name="target" defaultValue="">
                <option value="">General / no trip</option>
                {trips.map((t) => <option key={t.id} value={`trip:${t.id}`}>{t.name}</option>)}
              </select>
            </label>
            <label className="field"><span className="lbl">Expense type</span>
              <select name="category" defaultValue="misc">{EXP_CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="field"><span className="lbl">Amount spent</span><input name="amount" placeholder="12000 or 12k" required /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Paid to (vendor)</span><input name="payee" placeholder="Hotel · car · guide…" /></label>
            <label className="field"><span className="lbl">Mode</span>
              <select name="paymentMode" defaultValue="bank"><option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="card">Card</option><option value="cash">Cash</option><option value="other">Other</option></select>
            </label>
            <label className="field"><span className="lbl">Date</span><input name="date" type="date" defaultValue={today} /></label>
          </div>
          <div className="row">
            <label className="field"><span className="lbl">Notes</span><input name="notes" placeholder="3 nights · advance / balance…" /></label>
            <label className="field"><span className="lbl">Invoice / receipt <span className="small muted">optional</span></span><input name="file" type="file" accept="image/*,application/pdf" /></label>
          </div>
          <button className="primary" type="submit">Log expense</button>
          <p className="small muted" style={{ margin: "10px 0 0" }}>To pin it to a specific hotel or car, open <a href="/expenses" style={{ color: "var(--accent)" }}>Costing</a>. General spend (fuel, ads, salaries) stays untagged.</p>
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

      {/* BOOK HOTEL — multi-night stay, splits across days */}
      {action === "hotel" && (
        <form action={addHotelStay} key="hotel">
          <datalist id="qe-source-list">{sources.map((s) => <option key={s} value={s} />)}</datalist>
          <div className="row">
            <label className="field"><span className="lbl">Trip</span>
              <select name="tripId" required defaultValue={trips[0]?.id || ""}>{trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </label>
            <label className="field"><span className="lbl">Hotel name</span><input name="hotelName" list="hotel-list" placeholder="Pick or type a hotel" required /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Check-in</span><input name="checkIn" type="date" required /></label>
            <label className="field"><span className="lbl">Check-out</span><input name="checkOut" type="date" /></label>
            <label className="field"><span className="lbl">Rooms / night</span><input name="rooms" type="number" min="0" placeholder="3" /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Total cost (split across nights)</span><input name="cost" placeholder="₹ for the whole stay" /></label>
            <label className="field"><span className="lbl">Status</span>
              <select name="status" defaultValue="hold"><option value="hold">On hold</option><option value="final">Confirmed</option><option value="unbooked">Not booked</option></select>
            </label>
            <label className="field"><span className="lbl">Booked / held on</span><input name="source" list="qe-source-list" placeholder="Pick or type — Booking.com" /></label>
          </div>
          <button className="primary" type="submit">Add hotel stay</button>
          <p className="small muted" style={{ margin: "10px 0 0" }}>
            One row per night between check-in and check-out, cost split evenly. Dates outside the itinerary become new days (renumbered automatically), taking the location of the nearest day.
          </p>
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
