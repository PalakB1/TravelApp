"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { TOUR_STEPS } from "@/lib/tourSteps";

// The guided tour: a spotlight on one control at a time with a card explaining
// what it's for.
//
// The spotlight is a single fixed box with an enormous ring shadow — that one
// trick dims the whole page and cuts a hole in it, with no canvas or clip-path.
//
// Geometry is written straight to the DOM through refs rather than held in
// state. The overlay has to keep up with scrolling and resizing, and routing
// every pixel through a re-render would both stutter and mean calling setState
// from an effect on every frame.
//
// The on/off preference lives in localStorage, not the database: it's per
// person and per browser, and a schema migration would be a silly price for it.

const SEEN_KEY = "tz-tour-seen";
const PAD = 7; // breathing room around the highlighted element
const GAP = 12; // distance from the element to the card

// The first selector that resolves to something actually on screen.
//
// Presence isn't enough: the sidebar is display:none on a phone, so its links
// still match querySelector but measure 0×0 — which would shrink the spotlight
// to a dot in the top-left corner. Anything without a size is skipped, and the
// step falls back to a plain centred card.
function firstVisible(selectors?: string[]): HTMLElement | null {
  if (!selectors) return null;
  for (const sel of selectors) {
    for (const el of Array.from(document.querySelectorAll(sel))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el as HTMLElement;
    }
  }
  return null;
}

export function hasSeenTour() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // storage blocked → never nag
  }
}

export function setTourSeen(seen: boolean) {
  try {
    if (seen) localStorage.setItem(SEEN_KEY, "1");
    else localStorage.removeItem(SEEN_KEY);
  } catch { /* storage blocked — the preference just won't stick */ }
  window.dispatchEvent(new Event(PREF_EVENT));
}

// Fired by the Settings toggle and the demo banner to replay the tour.
export const TOUR_EVENT = "tz-start-tour";
// Fired when the preference changes, so the toggle can re-read it.
export const PREF_EVENT = "tz-tour-pref";
export function startTour() {
  window.dispatchEvent(new Event(TOUR_EVENT));
}

export default function Tour({ autoStart = false }: { autoStart?: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[i];
  const last = i === TOUR_STEPS.length - 1;

  const finish = useCallback(() => {
    setOpen(false);
    setTourSeen(true);
  }, []);

  // Offer it once, unprompted, to someone who has never seen it. The state
  // change happens in the timer callback, after the page has settled.
  useEffect(() => {
    if (!autoStart || hasSeenTour()) return;
    const t = setTimeout(() => { setI(0); setOpen(true); }, 700);
    return () => clearTimeout(t);
  }, [autoStart]);

  useEffect(() => {
    const go = () => { setI(0); setOpen(true); };
    window.addEventListener(TOUR_EVENT, go);
    return () => window.removeEventListener(TOUR_EVENT, go);
  }, []);

  // Position the spotlight and the card. Pure DOM writes — no React state.
  const layout = useCallback(() => {
    const card = cardRef.current;
    const spot = spotRef.current;
    const dim = dimRef.current;
    if (!card || !spot || !dim) return;

    const el = firstVisible(step?.target);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;

    if (!el) {
      // No target on this screen: dim everything and centre the card.
      spot.style.display = "none";
      dim.style.display = "block";
      card.style.top = `${Math.max(12, (vh - ch) / 2)}px`;
      card.style.left = `${Math.max(12, (vw - cw) / 2)}px`;
      return;
    }

    const r = el.getBoundingClientRect();
    dim.style.display = "none";
    spot.style.display = "block";
    spot.style.top = `${r.top - PAD}px`;
    spot.style.left = `${r.left - PAD}px`;
    spot.style.width = `${r.width + PAD * 2}px`;
    spot.style.height = `${r.height + PAD * 2}px`;

    // Under the target by preference, above if it won't fit, centred if neither
    // works. Always kept inside the viewport.
    let top = r.bottom + PAD + GAP;
    if (top + ch > vh - 12) {
      const above = r.top - PAD - GAP - ch;
      top = above >= 12 ? above : Math.max(12, (vh - ch) / 2);
    }
    card.style.top = `${top}px`;
    card.style.left = `${Math.min(Math.max(12, r.left), Math.max(12, vw - cw - 12))}px`;
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    firstVisible(step?.target)?.scrollIntoView({ block: "center", behavior: "smooth" });
    layout();
    const t = setTimeout(layout, 320); // settle after the smooth scroll
    return () => clearTimeout(t);
  }, [open, i, layout, step]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", layout);
    window.addEventListener("scroll", layout, true);
    return () => {
      window.removeEventListener("resize", layout);
      window.removeEventListener("scroll", layout, true);
    };
  }, [open, layout]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, TOUR_STEPS.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || !step) return null;

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Swallows every click, so the tour can't be half-used. */}
      <div className="tour-block" />
      <div ref={dimRef} className="tour-dim" style={{ display: "none" }} />
      <div ref={spotRef} className="tour-spot" style={{ display: "none" }} />

      {/* Parked off-screen for its first paint; layout() places it before the
          browser draws, so it never appears in the wrong spot. */}
      <div ref={cardRef} className="tour-card" style={{ top: -9999, left: -9999 }}>
        <div className="tour-count">Step {i + 1} of {TOUR_STEPS.length}</div>
        <div className="tour-title">{step.title}</div>
        <p className="tour-body">{step.body}</p>
        <div className="tour-actions">
          <button type="button" className="sm tour-skip" onClick={finish}>
            {last ? "Close" : "Skip tour"}
          </button>
          <span style={{ flex: 1 }} />
          {i > 0 && <button type="button" className="sm" onClick={() => setI((n) => n - 1)}>Back</button>}
          {last ? (
            <button type="button" className="primary sm" onClick={finish}>Got it</button>
          ) : (
            <button type="button" className="primary sm" onClick={() => setI((n) => n + 1)}>Next</button>
          )}
        </div>
      </div>
    </div>
  );
}
