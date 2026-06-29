# Trip Desk — travel company dashboard

A private dashboard to manage trips, prices, inclusions (and your own costs),
bookings, discounts, payments, and supplier bookings (hotels, cars) — with a
**chat box** that files everything for you in plain English.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3007

**Login:** `admin@travel.local` / `travel123`

## What's inside

Built for **self-drive group trips** (10–14 people, a new hotel most nights).

- **Dashboard** — revenue, your cost, profit + margin, outstanding from
  customers, and a "needs attention" count. An alerts panel lists unbooked
  nights and holds about to expire, across all trips.
- **Trips** — each trip is a **night-by-night itinerary**. Every night has a
  date, a location, and its hotel (name, rooms, cost) with a status:
  **not booked / on hold / confirmed**. On-hold bookings record *held until
  when* and *on which app* (Booking.com, Agoda…). Nights with no hotel are
  flagged red. A **car fleet** sits alongside — each car is client-driven (no
  extra cost) or has a hired driver (added cost), with its own hold/confirmed
  status.
- **Itinerary by Excel** — upload a spreadsheet and it builds the nights. See
  "Importing an itinerary" below.
- **Bookings** — each party (any size) with discount, total, paid, and balance.
- **Payments** — who still owes you, and the full payment history.

## Importing an itinerary

On a trip page, click **Choose Excel file** → **Import itinerary**, or
**Download template** to see the format. Columns (any order, flexible names):

| Date | Location | Hotel | Rooms | Cost |
| ---- | -------- | ----- | ----- | ---- |

Only **Location** (where the group sleeps that night) is required. Rows with no
hotel become unbooked nights you can fill in later. Importing replaces the
trip's current itinerary.

## The chat box

Type things like:

- `add trip Goa Getaway to Goa, 4 nights, 20 seats`
- `add Riya to Bali deluxe, 2 pax, 5000 festive discount`
- `Riya paid 40k by upi`

Right now the chat uses built-in rules (no AI key needed). The language
understanding lives in **one file**: `src/lib/chat.ts` (the `parseCommand`
function). To upgrade to full natural-language understanding later, paste your
Anthropic API key into `.env` (`ANTHROPIC_API_KEY=...`) and swap the body of
`parseCommand` to call Claude — everything else keeps working unchanged.

## Money

All amounts are whole rupees (₹). Profit math lives in `src/lib/calc.ts`:

- **Revenue** = per-party price (a total, or per-person × pax) − discount
- **Your cost** = hotels (each night) + car rentals + hired drivers + extras
- **Profit** = revenue − cost
- **Outstanding** = total − payments received
- **Needs attention** = unbooked nights + holds expiring within 3 days

## Tech

- Next.js 16 (App Router) + React 19
- Prisma 6 + SQLite (the database is the file `prisma/dev.db`)
- Login via a signed cookie (`src/lib/auth.ts`, `src/proxy.ts`)

### Reset the sample data

The database ships with one sample trip (Bali Escape). To start empty, delete
the trip from its page, or re-seed with `npm run db:seed`.

## Before sharing it online (deploying)

This runs on your computer today. To put it online so both of you can log in
from anywhere, two things change: move `AUTH_SECRET` in `.env` to a long random
value, and switch the database from SQLite to a hosted one (e.g. Postgres).
Ask Claude to "deploy Trip Desk" when you're ready and it'll walk through it.
