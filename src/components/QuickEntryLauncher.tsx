"use client";

import { useEffect, useRef, useState } from "react";
import QuickEntry from "./QuickEntry";
import type { ComboOption } from "./Combobox";

type Data = { payable: ComboOption[]; trips: { id: string; name: string }[]; customerNames: string[]; sources: string[] };

// Global overlay that hosts Quick entry. Opened from anywhere via the
// "open-quick-entry" window event (see QuickAddButton / BottomNav). Data is
// fetched lazily on first open. Renders as a bottom sheet on phones and a
// centered modal on desktop (styled in globals.css).
export default function QuickEntryLauncher() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const openFn = () => setOpen(true);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("open-quick-entry", openFn);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("open-quick-entry", openFn); window.removeEventListener("keydown", esc); };
  }, []);

  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    fetch("/api/quick-entry")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => { loaded.current = false; });
  }, [open]);

  if (!open) return null;

  return (
    <div className="qe-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      {/* Any successful submit inside closes the panel; SaveToast then confirms. */}
      <div className="qe-panel" onSubmit={() => setTimeout(() => setOpen(false), 60)}>
        <div className="qe-grip" />
        <div className="qe-head">
          <span className="qe-title">⚡ Quick entry</span>
          <button type="button" className="qe-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="qe-body">
          {data
            ? <QuickEntry payable={data.payable} trips={data.trips} customerNames={data.customerNames} sources={data.sources} />
            : <div className="empty">Loading…</div>}
        </div>
      </div>
    </div>
  );
}
