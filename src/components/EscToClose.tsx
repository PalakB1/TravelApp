"use client";

import { useEffect } from "react";

// Press Escape to collapse the innermost open <details> (the open "add/edit" panels).
export default function EscToClose() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const open = Array.from(document.querySelectorAll<HTMLDetailsElement>("details[open]"));
      if (open.length === 0) return;
      const active = document.activeElement;
      const target = open.reverse().find((d) => active && d.contains(active)) ?? open[0];
      target.removeAttribute("open");
      target.querySelector("summary")?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
