// Minimal service worker. Chrome will not offer "Install app" without one that
// handles fetch — so this exists to make TripZei installable, nothing more.
//
// It deliberately does NOT cache. This is a live financial dashboard: a cached
// page showing yesterday's balance is worse than no app at all. Requests pass
// straight through to the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // No respondWith() — the browser handles the request normally.
});
