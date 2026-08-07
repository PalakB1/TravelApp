import type { MetadataRoute } from "next";

// Makes TripZei installable to a phone's home screen, so staff open the desk
// from an icon rather than a bookmark. There is no app-store build behind this
// — it's the same site, running without browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TripZei — travel desk",
    short_name: "TripZei",
    description: "Run trips, bookings, payments and profit from one desk.",
    // Opens straight into the workspace. Signed-out visitors get bounced to
    // /login by the proxy, which is the right landing spot for an app icon.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops icons to its own shape; this one has the safe-zone padding.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Payments", short_name: "Payments", url: "/payments" },
      { name: "Bookings", short_name: "Bookings", url: "/bookings" },
      { name: "Trips", short_name: "Trips", url: "/trips" },
    ],
  };
}
