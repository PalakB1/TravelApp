"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// The search panel is imported dynamically, so its code isn't in the bundle
// every page loads — it's fetched the first time someone actually searches.
// That's the whole point: a search box that makes every other screen slower
// would be a bad trade.
const SearchOverlay = dynamic(() => import("./SearchOverlay"), { ssr: false });

export default function SearchButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  // Ctrl/Cmd+K on a laptop. Costs one listener and nothing else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className={compact ? "srch-btn" : "srch-btn srch-wide"}
        onClick={() => setOpen(true)}
        aria-label="Search everything"
        title="Search customers, bookings, trips and hotels"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
        </svg>
        {!compact && <span>Search</span>}
        {!compact && <kbd className="srch-kbd">⌘K</kbd>}
      </button>
      {open && <SearchOverlay onClose={() => setOpen(false)} />}
    </>
  );
}
