"use client";

import { useEffect } from "react";

type Fill = { targetId: string; key: string };
type Record_ = Record<string, string | number | null | undefined>;

// Watches a "name" input; when its value matches a known person, fills the
// linked phone/age inputs (by id) — but never overwrites a value the user typed.
export default function AutoFill({
  sourceId,
  fills,
  data,
}: {
  sourceId: string;
  fills: Fill[];
  data: Record<string, Record_>;
}) {
  useEffect(() => {
    const src = document.getElementById(sourceId) as HTMLInputElement | null;
    if (!src) return;
    const apply = () => {
      const rec = data[src.value.trim().toLowerCase()];
      for (const f of fills) {
        const tgt = document.getElementById(f.targetId) as HTMLInputElement | null;
        if (!tgt) continue;
        // only touch fields that are empty or were filled by us before
        if (tgt.value && tgt.dataset.autofilled !== "1") continue;
        const val = rec ? rec[f.key] : null;
        if (val != null && val !== "") {
          tgt.value = String(val);
          tgt.dataset.autofilled = "1";
        } else if (tgt.dataset.autofilled === "1") {
          tgt.value = "";
          delete tgt.dataset.autofilled;
        }
      }
    };
    src.addEventListener("input", apply);
    src.addEventListener("change", apply);
    return () => {
      src.removeEventListener("input", apply);
      src.removeEventListener("change", apply);
    };
  }, [sourceId, fills, data]);

  return null;
}
