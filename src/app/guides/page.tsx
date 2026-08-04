import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = {
  title: "How to use TripZei — guides",
  description: "Short, practical walkthroughs: set up your workspace, run a trip, get paid, and close the books.",
};

// Written as tasks an operator actually has, not as a tour of the menu. Each step
// says where to click and what happens, so it doubles as onboarding.
const GUIDES: { id: string; icon: string; title: string; blurb: string; steps: { t: string; d: string }[] }[] = [
  {
    id: "setup",
    icon: "🏁",
    title: "Set up your workspace",
    blurb: "Ten minutes once, and every trip you create afterwards inherits it.",
    steps: [
      { t: "Add your business details", d: "Settings → Business & branding. Your name, logo and tax details appear on every invoice, receipt and payment page your customers see." },
      { t: "Create a payment plan", d: "Settings → Payment plans. Start from a ready-made one — 25% on booking, balance before travel — or build your own from percentages, flat amounts, or “whatever's left”. Mark one as your default." },
      { t: "Write your cancellation policy", d: "Settings → Cancellation & refund policy. A standard one is already filled in — edit it or save it as-is. It prints on every invoice automatically." },
      { t: "Invite your team", d: "Settings → Workspace → Team. You can limit someone to specific trips, and promote a colleague to admin so they can manage the team too." },
    ],
  },
  {
    id: "first-trip",
    icon: "🗺",
    title: "Run your first trip",
    blurb: "From an empty screen to a trip that knows what it costs.",
    steps: [
      { t: "Create the trip", d: "Trips → New trip. Give it a name, destination and departure date. Nights and days set the shape of the itinerary." },
      { t: "Build the itinerary", d: "Open the trip and add a night for each stop — or import the whole thing from a spreadsheet. Each night holds the hotels for that stop." },
      { t: "Add hotels per night", d: "Click any day in “Hotels — rooms per night” to add the hotel, rooms held and cost. Anything on hold shows a countdown before it lapses." },
      { t: "Add your cars and inclusions", d: "Cars carry rental, driver cost and seats. Inclusions — breakfast, permits, a guide — get priced per person and attach to every booking automatically." },
      { t: "Reuse it next season", d: "Done well? Use “Run this itinerary on new dates”. Every night, hotel plan and price copies across with the dates shifted." },
    ],
  },
  {
    id: "get-paid",
    icon: "◈",
    title: "Get paid without chasing",
    blurb: "The part that decides whether a good month is a good month.",
    steps: [
      { t: "Add the booking", d: "From the trip, add the party with their price. Your default payment plan is applied straight away — no extra step." },
      { t: "See what's owed", d: "Payments → Who owes you. Each customer shows what's due right now and their full remaining balance. Sort by whoever owes most." },
      { t: "Send the reminder", d: "Tap Remind. WhatsApp opens with the amount, the due date and a link — from your own number, so it reads like you wrote it." },
      { t: "Record the payment", d: "Log it under the booking, or let the customer confirm it themselves through the link and approve it under “To approve”." },
      { t: "Send the receipt", d: "Payments → Payment receipts → Share. A branded receipt goes out on WhatsApp in one tap." },
    ],
  },
  {
    id: "money-out",
    icon: "💸",
    title: "Track what a trip really costs",
    blurb: "So the profit figure means something.",
    steps: [
      { t: "Log every spend", d: "Costing → Add a spend. Tag it to a trip — or to a specific hotel or car — and attach the supplier invoice. Untagged spends count as overhead." },
      { t: "Handle personal spends", d: "When someone pays from their own pocket, tick “paid from personal money”. It shows as owed to them until settled." },
      { t: "Reimburse in one go", d: "Costing → Reimburse personal spends. Tick everything you're settling, record the transfer reference, and they're all cleared together." },
      { t: "Read the real margin", d: "The trip's cost includes rooms you haven't booked yet, so the profit shown is the profit you'll actually keep — not a flattering half-picture." },
    ],
  },
  {
    id: "close",
    icon: "🧾",
    title: "Close the trip",
    blurb: "Invoices, tax and the paperwork nobody enjoys.",
    steps: [
      { t: "Generate the invoice", d: "Once the trip is over, Bookings shows a Generate invoice button. Numbers are sequential and gap-free per financial year." },
      { t: "Send it", d: "Share on WhatsApp, or download the PDF. Your cancellation terms are printed on it already." },
      { t: "Mark tax as remitted", d: "The booking's tax tile has a button to record that you've paid it across, so you can tell at a glance what's still outstanding." },
      { t: "Export anything", d: "Bookings and Payments both have Download CSV, if you or your accountant would rather work in a spreadsheet." },
    ],
  },
  {
    id: "quick",
    icon: "⚡",
    title: "Work at speed with Quick entry",
    blurb: "The habit that keeps everything else accurate.",
    steps: [
      { t: "Use it from anywhere", d: "The Quick add button sits on every screen. A payment, an expense, a booking, a hotel, a customer or a whole trip — logged without navigating away from what you were doing." },
      { t: "Or just type it", d: "On the dashboard, write it the way you'd say it: “Riya paid 40k upi”, or “add trip Goa Getaway to Goa, 4 nights, 20 seats”." },
      { t: "Check the morning list", d: "“Needs you today” on the dashboard shows overdue money, trips departing this week, visas in progress and invoices ready — each one tap from the thing itself." },
    ],
  },
];

export default function GuidesPage() {
  return (
    <div className="doc-light" style={{ minHeight: "100vh", padding: "28px 16px 70px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div className="between" style={{ marginBottom: 26, flexWrap: "wrap", gap: 12 }}>
          <Link href="/"><Logo height={28} plain /></Link>
          <div className="flex" style={{ gap: 8 }}>
            <Link className="btn sm" href="/">Home</Link>
            <Link className="btn sm primary" href="/signup">Start free</Link>
          </div>
        </div>

        <h1 style={{ fontSize: 30, letterSpacing: "-0.02em" }}>How to use TripZei</h1>
        <p className="muted" style={{ marginTop: 8, marginBottom: 22, fontSize: 15.5, maxWidth: 620 }}>
          Short walkthroughs for the jobs you actually do. Each one is a few minutes, and you can
          do them in any order — though the first makes the rest quicker.
        </p>

        {/* Contents — handy on a phone, where the page is long. */}
        <div className="card" style={{ marginBottom: 22 }}>
          <div className="card-title">Guides</div>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            {GUIDES.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="btn sm">{g.icon} {g.title}</a>
            ))}
          </div>
        </div>

        {GUIDES.map((g) => (
          <section key={g.id} id={g.id} className="card" style={{ scrollMarginTop: 20 }}>
            <div className="card-title" style={{ display: "block" }}>
              <span style={{ fontSize: 18 }}>{g.icon} {g.title}</span>
              <div className="small muted" style={{ fontWeight: 400, marginTop: 4 }}>{g.blurb}</div>
            </div>
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", counterReset: "step" }}>
              {g.steps.map((st) => (
                <li key={st.t} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                  <span
                    aria-hidden
                    style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, background: "var(--accent-bg)", color: "var(--accent)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, marginTop: 2 }}
                  >
                    {g.steps.indexOf(st) + 1}
                  </span>
                  <span>
                    <b style={{ fontSize: 14.5 }}>{st.t}</b>
                    <div className="small muted" style={{ marginTop: 2, lineHeight: 1.55 }}>{st.d}</div>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Stuck on something not covered here?</div>
          <p className="small muted" style={{ marginTop: 6 }}>
            Tell us what you were trying to do and we&apos;ll walk you through it — and write the guide for the next person.
          </p>
          <Link className="btn primary sm" href="/#pricing" style={{ marginTop: 10 }}>Get in touch</Link>
        </div>
      </div>
    </div>
  );
}
