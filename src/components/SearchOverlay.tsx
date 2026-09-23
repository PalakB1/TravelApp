"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Hit } from "@/app/api/search/route";

// The search panel itself.
//
// Loaded only when the button is first tapped (see SearchButton), so none of
// this reaches the browser on a normal page load.
//
// Three things keep it from being a drag on the app: nothing is requested until
// two characters are typed, keystrokes are debounced so a five-letter name is
// one request rather than five, and each new request aborts the one before it
// so a slow earlier answer can never overwrite a newer one.
const MIN = 2;
const DEBOUNCE_MS = 220;

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const term = q.trim();
    const ctrl = new AbortController();

    // Every state change happens in the timer callback rather than here:
    // setting state straight from an effect body forces a second render before
    // the first has painted, which is exactly what a search box shouldn't do.
    const t = setTimeout(async () => {
      if (term.length < MIN) { setHits([]); setBusy(false); return; }
      setBusy(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await r.json();
        setHits(data.hits ?? []);
        setActive(0);
      } catch {
        // Aborted by the next keystroke, or offline — either way, say nothing.
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, DEBOUNCE_MS);

    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const go = (href: string) => { onClose(); router.push(href); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && hits[active]) { e.preventDefault(); go(hits[active].href); }
  };

  const term = q.trim();

  return (
    <div className="srch-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="srch-panel" onKeyDown={onKey}>
        <div className="srch-head">
          <span aria-hidden>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Customer, booking, trip or hotel…"
            aria-label="Search everything"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="button" className="sm" onClick={onClose} aria-label="Close search">✕</button>
        </div>

        <div className="srch-body">
          {term.length < MIN ? (
            <p className="srch-hint">Type at least {MIN} letters — a name, a phone number, a trip or a hotel.</p>
          ) : busy && hits.length === 0 ? (
            <p className="srch-hint">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="srch-hint">Nothing matches “{term}”.</p>
          ) : (
            hits.map((h, i) => (
              <button
                key={`${h.kind}-${h.href}-${i}`}
                type="button"
                className={`srch-hit ${i === active ? "on" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h.href)}
              >
                <span className="srch-kind">{h.kind}</span>
                <span className="srch-main">
                  <span className="srch-title">{h.title}</span>
                  <span className="srch-sub">{h.sub}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
