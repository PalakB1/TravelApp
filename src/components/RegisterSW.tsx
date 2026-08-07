"use client";

import { useEffect } from "react";

// Registers the (deliberately cache-free) service worker so browsers treat
// TripZei as installable. Silent by design: if registration fails the site
// simply stays a normal website.
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
