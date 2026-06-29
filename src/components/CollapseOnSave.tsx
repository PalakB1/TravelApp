"use client";

import { useEffect } from "react";

// When any add/edit form inside a collapsible panel is submitted, collapse that
// panel automatically. Skips the big section/card containers and the read-only
// day rows so only the small "add / edit" panels close.
export default function CollapseOnSave() {
  useEffect(() => {
    const handler = (e: Event) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      const details = form.closest("details");
      if (!details) return;
      if (
        details.classList.contains("section") ||
        details.classList.contains("card") ||
        details.classList.contains("rpn-day")
      ) {
        return;
      }
      // let the submit dispatch first, then collapse
      setTimeout(() => details.removeAttribute("open"), 0);
    };
    document.addEventListener("submit", handler, true);
    return () => document.removeEventListener("submit", handler, true);
  }, []);
  return null;
}
