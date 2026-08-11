import { ImageResponse } from "next/og";

// The card every pasted TripZei link renders as — WhatsApp, LinkedIn, Slack,
// and the directory listings. Generated rather than a static file so it stays
// in step with the palette.
//
// Satori (what renders this) is not a browser: every element holding more than
// one child needs an explicit display, and <br> doesn't work. Hence the flex on
// everything and the two separate headline rows.
export const alt = "TripZei — back-office software for travel agencies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #082030 0%, #0d3049 55%, #14506e 100%)",
          padding: "70px 78px",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 15,
              marginRight: 18,
              background: "linear-gradient(135deg, #f86048 0%, #e8492b 100%)",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            TZ
          </div>
          <div style={{ display: "flex", fontSize: 35, fontWeight: 700 }}>TripZei</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 70, fontWeight: 800, letterSpacing: -2 }}>
            Run the trip.
          </div>
          <div style={{ display: "flex", fontSize: 70, fontWeight: 800, letterSpacing: -2, color: "#fb8768", marginTop: 4 }}>
            Keep the margin.
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#b8cbd8", lineHeight: 1.45, maxWidth: 900, marginTop: 26 }}>
            Bookings, payment plans, supplier costs, visas and tax invoices for tour operators —
            with live profit on every trip.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", fontSize: 23, color: "#8fc4e4" }}>
          <div style={{ display: "flex" }}>tripzei.com</div>
          <div style={{ display: "flex", margin: "0 14px", color: "#456b83" }}>·</div>
          <div style={{ display: "flex" }}>Live demo, no signup</div>
        </div>
      </div>
    ),
    size,
  );
}
