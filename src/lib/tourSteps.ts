// What the guided tour says, and what it points at.
//
// Targets are given as a list of selectors, first match wins — the sidebar on a
// laptop, the bottom bar on a phone. If none of them are on screen (a module
// that's switched off, a nav item hidden behind "More"), the step still runs as
// a plain centred card: the explanation is worth more than the arrow.

export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** Tried in order. Omit for a centred card with no spotlight. */
  target?: string[];
};

const nav = (href: string) => [`.sidebar .nav a[href="${href}"]`, `.bottom-nav a[href="${href}"]`];

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Here's the two-minute tour",
    body:
      "Every screen does one job. I'll walk you through them in order. " +
      "You can stop any time, and switch the tour back on from Settings.",
  },
  {
    id: "dashboard",
    title: "Dashboard — start here each morning",
    body:
      "Anything that needs you today sits at the top: money that's overdue, hotel holds about to lapse, " +
      "and nights on a trip with no room booked yet.",
    target: nav("/dashboard"),
  },
  {
    id: "trips",
    title: "Trips — one card per departure",
    body:
      "Open a trip to see its night-by-night itinerary, who's booked on it, how many rooms you still owe, " +
      "and what it's actually making — not what you hoped it would make.",
    target: nav("/trips"),
  },
  {
    id: "hotels",
    title: "Hotels — every night, every trip",
    body:
      "One list of all your nights across all trips. A night shown in red has no room held against it. " +
      "This is the screen that stops a group arriving somewhere with nowhere to sleep.",
    target: nav("/hotels"),
  },
  {
    id: "customers",
    title: "Customers — your client book",
    body:
      "Everyone who has ever travelled with you, with their history and your notes. " +
      "It stays yours: you can export it whenever you want.",
    target: nav("/customers"),
  },
  {
    id: "bookings",
    title: "Bookings — who's going, and on what terms",
    body:
      "What each customer was quoted, what they've paid, their visa status and their cancellation window. " +
      "Once a trip finishes, the tax invoice is one tap from here.",
    target: nav("/bookings"),
  },
  {
    id: "payments",
    title: "Payments — money due, in one place",
    body:
      "Everyone who owes you, sorted by who owes most. Send a WhatsApp reminder in a tap, " +
      "and approve payments customers upload themselves through your payment link.",
    target: nav("/payments"),
  },
  {
    id: "expenses",
    title: "Costing — what the trip really cost",
    body:
      "Log every supplier bill, fuel receipt and salary. Tag it to a trip and that trip's profit updates itself. " +
      "Staff spend from their own pocket gets reimbursed here too.",
    target: nav("/expenses"),
  },
  {
    id: "visas",
    title: "Visa desk — stop chasing documents",
    body:
      "Send one link. The traveller fills in their own details, and you get a cover letter and a " +
      "document checklist back, already filled with the trip's dates and hotels.",
    target: nav("/visas"),
  },
  {
    id: "tax",
    title: "GST / Tax — what you owe the government",
    body: "Tax collected, tax already remitted, and what's still outstanding — per trip and per quarter.",
    target: nav("/tax"),
  },
  {
    id: "quickadd",
    title: "Quick add — the shortcut you'll use most",
    body:
      "Add a booking, a payment or an expense from anywhere, without first finding the right screen.",
    target: ['.sidebar button[aria-label="Quick add"]', ".bn-fab"],
  },
  {
    id: "settings",
    title: "Settings — set it up once",
    body:
      "Your team, your payment plans, your cancellation policy, your GST details and the recycle bin. " +
      "Set the payment plan up here and it applies itself to every new booking.",
    target: ['.sidebar a[href="/settings"]', '.bottom-nav a[href="/settings"]'],
  },
  {
    id: "done",
    title: "That's the whole thing",
    body:
      "Nine screens. Start by creating a trip, then add a booking to it — the money side follows on its own. " +
      "You can replay this tour any time from Settings.",
  },
];
