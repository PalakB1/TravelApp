"use client";

import { useEffect, useRef, useState } from "react";

// A global "Saved ✓" toast: listens for any mutation form submit (server actions)
// and confirms it, so a save never feels like nothing happened. GET/search forms
// are skipped. Optimistic — most saves succeed; forms that fail also show their
// own inline error.
export default function SaveToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const t1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if ((form.getAttribute("method") || "").toLowerCase() === "get") return; // search / nav
      if (form.dataset.notoast === "1") return;
      clearTimeout(t1.current);
      clearTimeout(t2.current);
      setSaved(false);
      setMsg("Saving…");
      t1.current = setTimeout(() => { setSaved(true); setMsg("Saved ✓"); }, 600);
      t2.current = setTimeout(() => setMsg(null), 2400);
    };
    document.addEventListener("submit", handler, true);
    return () => document.removeEventListener("submit", handler, true);
  }, []);

  if (!msg) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 2000,
        background: saved ? "var(--success)" : "var(--text)", color: "#fff",
        padding: "9px 20px", borderRadius: 999, fontSize: 13.5, fontWeight: 600,
        boxShadow: "0 10px 30px rgba(0,0,0,0.28)", pointerEvents: "none",
      }}
    >
      {msg}
    </div>
  );
}
