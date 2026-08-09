"use client";

import { useCallback, useSyncExternalStore } from "react";
import { startTour, hasSeenTour, setTourSeen, PREF_EVENT } from "./Tour";

// The on/off switch for the guided tour, and the way to replay it.
//
// "Off" means the tour is marked as seen, so it stops offering itself on
// arrival. "On" clears that, so it appears again on the next screen — and the
// button beside it runs it immediately.
//
// localStorage is read through useSyncExternalStore rather than an effect: the
// server render has no storage to read, and this keeps the switch honest
// without flipping under the user's eyes after hydration.
export default function TourToggle() {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(PREF_EVENT, onChange);
    window.addEventListener("storage", onChange); // changed in another tab
    return () => {
      window.removeEventListener(PREF_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const seen = useSyncExternalStore(
    subscribe,
    () => hasSeenTour(),
    () => true, // server render: assume seen, so nothing flashes on first paint
  );

  return (
    <>
      <div className="flex" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label className="flex" style={{ gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={!seen} onChange={(e) => setTourSeen(!e.target.checked)} />
          <span style={{ fontSize: 13.5 }}>Show me the guided tour automatically</span>
        </label>
        <span style={{ flex: 1 }} />
        <button type="button" className="sm" onClick={startTour}>Take the tour now</button>
      </div>
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        Thirteen short pointers explaining what each screen is for. This setting is per browser,
        so turning it on won&apos;t start the tour for your colleagues.
      </p>
    </>
  );
}
