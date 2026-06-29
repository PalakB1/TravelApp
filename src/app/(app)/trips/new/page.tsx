import Link from "next/link";
import { createTrip } from "../../data-actions";

export default function NewTripPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>New trip</h1>
          <p className="sub">Add the basics now — prices, inclusions and bookings come next.</p>
        </div>
        <Link className="btn" href="/trips">Cancel</Link>
      </div>

      <div className="card" style={{ maxWidth: 620 }}>
        <form action={createTrip}>
          <label className="field">
            <span className="lbl">Trip name</span>
            <input name="name" placeholder="Bali Escape" required />
          </label>
          <label className="field">
            <span className="lbl">Destination</span>
            <input name="destination" placeholder="Bali, Indonesia" />
          </label>
          <div className="row-3">
            <label className="field">
              <span className="lbl">Nights</span>
              <input name="nights" type="number" min="0" placeholder="6" />
            </label>
            <label className="field">
              <span className="lbl">Days</span>
              <input name="days" type="number" min="0" placeholder="7" />
            </label>
            <label className="field">
              <span className="lbl">Guests / room</span>
              <input name="maxPerRoom" type="number" min="1" max="6" defaultValue={2} />
            </label>
          </div>
          <div className="row">
            <label className="field">
              <span className="lbl">Departure date</span>
              <input name="departureDate" type="date" />
            </label>
            <label className="field">
              <span className="lbl">End date</span>
              <input name="endDate" type="date" />
            </label>
          </div>
          <label className="field">
            <span className="lbl">Notes (optional)</span>
            <textarea name="notes" rows={2} placeholder="Anything to remember about this departure" />
          </label>
          <button className="primary" type="submit">Create trip</button>
        </form>
      </div>
    </>
  );
}
