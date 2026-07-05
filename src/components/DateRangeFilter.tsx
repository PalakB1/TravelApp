"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Two date inputs that scope the dashboard to a departure-date window.
// Changing either updates ?from=/?to= (defaults to a rolling one-year window).
export default function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  function set(key: "from" | "to", val: string) {
    const params = new URLSearchParams(sp.toString());
    if (val) params.set(key, val);
    else params.delete(key);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span className="small muted">Trips from</span>
      <input type="date" value={from} onChange={(e) => set("from", e.target.value)} style={{ fontSize: 13, padding: "6px 8px", width: 148 }} />
      <span className="small muted">to</span>
      <input type="date" value={to} onChange={(e) => set("to", e.target.value)} style={{ fontSize: 13, padding: "6px 8px", width: 148 }} />
    </div>
  );
}
