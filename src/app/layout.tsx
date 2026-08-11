import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

// The site's identity everywhere it gets quoted: search results, the card that
// renders when a link is pasted into WhatsApp or LinkedIn, and the directory
// listings. The old title said "travel dashboard" — a phrase no operator
// searches for — and there were no Open Graph tags at all, so every shared link
// rendered as a bare grey box.
const TITLE = "TripZei — back-office software for travel agencies";
const DESCRIPTION =
  "Run tour operations from one desk: bookings, payment plans that chase themselves, " +
  "supplier costs, visas and gap-free tax invoices — with live profit on every trip.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://tripzei.com"),
  title: { default: TITLE, template: "%s · TripZei" },
  description: DESCRIPTION,
  applicationName: "TripZei",
  keywords: [
    "tour operator software", "travel agency software", "travel back office",
    "trip costing", "travel agency invoicing", "group departure management",
    "travel CRM", "itinerary and rooming", "visa tracking for tour operators",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "TripZei",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
  // Lets iOS "Add to Home Screen" open without Safari's chrome, like an app.
  appleWebApp: { capable: true, title: "TripZei", statusBarStyle: "default" },
};

// Tints the phone's status bar to match the app surface in each theme, so the
// installed app doesn't show a white strip above a dark screen.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4fb" },
    { media: "(prefers-color-scheme: dark)", color: "#061119" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Apply the saved theme before first paint so there's no light flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
