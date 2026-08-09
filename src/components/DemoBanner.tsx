"use client";

import Link from "next/link";
import { startTour } from "./Tour";

// Shown on every page of the demo workspace. Three jobs: stop anyone thinking
// this is their own data, offer the guided tour to someone who just landed in
// an unfamiliar dashboard, and keep signup one tap away — a prospect enjoying
// the demo is the likeliest person to convert all week.
export default function DemoBanner() {
  return (
    <div className="demo-banner">
      <span className="demo-dot" aria-hidden />
      <span>
        <b>Demo workspace.</b>{" "}
        <span className="demo-hide-sm">
          Everything here is invented — three trips at different stages. Change whatever you like; it resets.
        </span>
      </span>
      <button type="button" className="sm" onClick={startTour} style={{ marginLeft: "auto", flexShrink: 0 }}>
        Take the tour
      </button>
      <Link className="btn primary sm" href="/signup" style={{ marginLeft: 0, flexShrink: 0 }}>
        Start free
      </Link>
    </div>
  );
}
