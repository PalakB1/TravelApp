"use client";

import { useEffect, useRef, useState } from "react";

// A global "Saved ✓" toast: listens for any mutation form submit (server actions)
// and confirms it, so a save never feels like nothing happened. GET/search forms
// are skipped.
//
// It says "Saved ✓" only once the page content actually changes — a server action
// revalidates and re-renders, which shows up as a DOM mutation. Previously this
// flipped to "Saved" on a fixed 600ms timer whether or not the save had finished
// (or succeeded), which could reassure the user about a write that never landed.
export default function SaveToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const hide = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const giveUp = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const observer = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const stopWatching = () => { observer.current?.disconnect(); observer.current = null; };

    const handler = (e: Event) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if ((form.getAttribute("method") || "").toLowerCase() === "get") return; // search / nav
      if (form.dataset.notoast === "1") return;

      clearTimeout(hide.current);
      clearTimeout(giveUp.current);
      stopWatching();
      setSaved(false);
      setMsg("Saving…");

      const target = document.querySelector("main.main") ?? document.body;
      const done = () => {
        stopWatching();
        clearTimeout(giveUp.current);
        setSaved(true);
        setMsg("Saved ✓");
        hide.current = setTimeout(() => setMsg(null), 1800);
      };
      // The re-render after the action completes is our success signal.
      observer.current = new MutationObserver(done);
      observer.current.observe(target, { childList: true, subtree: true, characterData: true });
      // Safety net: never spin forever if nothing re-renders.
      giveUp.current = setTimeout(() => { stopWatching(); setMsg(null); }, 10000);
    };

    document.addEventListener("submit", handler, true);
    return () => { document.removeEventListener("submit", handler, true); stopWatching(); };
  }, []);

  if (!msg) return null;
  return (
    <div
      className="save-toast"
      aria-live="polite"
      style={{
        position: "fixed", bottom: 24, left: "50%", zIndex: 2000,
        // "Saving" uses the text colour as a pill; its label must be the page
        // background so it stays readable when the theme flips (in dark mode
        // --text is near-white, so white-on-white would vanish).
        background: saved ? "var(--success)" : "var(--text)", color: saved ? "#fff" : "var(--bg)",
        padding: "9px 20px", borderRadius: 999, fontSize: 13.5, fontWeight: 600,
        boxShadow: "0 10px 30px rgba(0,0,0,0.28)", pointerEvents: "none",
        transition: "background .25s ease",
      }}
    >
      {saved ? "Saved ✓" : msg}
    </div>
  );
}
