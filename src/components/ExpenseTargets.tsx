"use client";

import { useState } from "react";

export type TargetTrip = {
  id: string;
  name: string;
  items: { ref: string; label: string; group: string }[];
};

// Picks what a spend paid for: a trip, and optionally any number of the things
// inside it.
//
// One supplier invoice regularly covers three nights at the same hotel, or a car
// plus its driver. Forcing that into one item meant either splitting the bill by
// hand into three entries, or tagging it to the trip and losing the per-item
// reconciliation. Tick as many as the bill covers and the amount is shared
// between them, weighted by what each was estimated to cost.
export default function ExpenseTargets({
  trips,
  defaultTripId = "",
}: {
  trips: TargetTrip[];
  defaultTripId?: string;
}) {
  const [tripId, setTripId] = useState(defaultTripId);
  const [picked, setPicked] = useState<string[]>([]);

  const trip = trips.find((t) => t.id === tripId);
  const groups = [...new Set(trip?.items.map((i) => i.group) ?? [])];

  const toggle = (ref: string) =>
    setPicked((p) => (p.includes(ref) ? p.filter((x) => x !== ref) : [...p, ref]));

  return (
    <>
      <label className="field">
        <span className="lbl">Which trip?</span>
        <select
          name="tripId"
          value={tripId}
          onChange={(e) => { setTripId(e.target.value); setPicked([]); }}
        >
          <option value="">General / no trip</option>
          {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>

      {trip && trip.items.length > 0 && (
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <span className="lbl">
            What did it pay for? <span className="small muted">optional · tick everything this one bill covers</span>
          </span>
          <div className="pick-grid">
            {groups.map((g) => (
              <div key={g}>
                <div className="small muted" style={{ fontWeight: 600, margin: "2px 0 4px" }}>{g}</div>
                {trip.items.filter((i) => i.group === g).map((i) => (
                  <label key={i.ref} className="pick-row">
                    <input
                      type="checkbox"
                      name="items"
                      value={i.ref}
                      checked={picked.includes(i.ref)}
                      onChange={() => toggle(i.ref)}
                    />
                    <span>{i.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          {picked.length > 1 && (
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              {picked.length} items ticked — the amount is split between them in proportion to what each was
              estimated to cost, so the trip still reconciles item by item.
            </p>
          )}
        </div>
      )}
    </>
  );
}
