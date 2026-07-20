"use client";

import { useEffect } from "react";

// On phones every data table (.main table.t) is restyled into stacked cards by
// CSS. For each cell to show which column it is, we copy the matching <th> text
// onto the cell as data-label (read by `td::before` in globals.css). Done in the
// client so we never have to hand-annotate 20-odd tables — and re-run when a
// table's rows change (e.g. TableSearch filtering).
export default function TableLabels() {
  useEffect(() => {
    const label = () => {
      document.querySelectorAll<HTMLTableElement>(".main table.t").forEach((t) => {
        const heads = [...t.querySelectorAll("thead th")].map((h) => h.textContent?.trim() || "");
        if (!heads.length) return;
        t.querySelectorAll("tbody tr").forEach((tr) => {
          [...tr.children].forEach((td, i) => {
            if (td instanceof HTMLElement && !td.dataset.label && heads[i]) td.dataset.label = heads[i];
          });
        });
      });
    };

    label();
    // Coalesce bursts of DOM changes into one pass per frame.
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; label(); });
    };
    const obs = new MutationObserver(schedule);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  return null;
}
