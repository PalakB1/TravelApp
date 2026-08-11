# TripZei

Back-office software for travel agencies and tour operators. Trips, bookings,
payments, supplier costs, visas and GST in one place — with live profit per trip
rather than a number you work out weeks later.

Live at **[tripzei.com](https://tripzei.com)**. Multi-tenant: each agency signs
up, gets its own workspace, and never sees another agency's data.

See it without an account: **[tripzei.com/demo](https://tripzei.com/demo)**

---

## Running it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

You need a `.env` with at least:

```
DATABASE_URL=postgresql://…      # Neon, or any Postgres
AUTH_SECRET=<long random string> # signs the session cookie
```

Then create a workspace through `/signup` like a real user would. To get data
worth looking at, build the demo workspace instead:

```bash
npm run db:demo
```

That creates the **Northlight Journeys (Demo)** org — three trips at three
different stages, twelve customers, payment plans mid-flight, a visa desk in
progress and a full costing ledger. Log in as `demo@tripzei.com` / `seetripzei`.
Re-run it any time to wipe and rebuild; it only ever touches the demo org.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | `prisma migrate deploy` then `next build` |
| `npm test` | Vitest — the money maths in `src/lib` |
| `npm run lint` | ESLint |
| `npm run db:demo` | Rebuild the public demo workspace |
| `npm run db:seed` | Original single-user seed (see *Loose ends*) |

---

## What's in it

**Dashboard** — what needs you today: money overdue, hotel holds about to lapse,
nights with no room booked, visas needing action. Plus revenue, cost, profit and
margin across every live trip.

**Trips** — a trip is a night-by-night itinerary. Each night has a date, a
location and its hotels (rooms, cost, status: *not booked / on hold / confirmed /
paid*). Nights with nothing held show red. Alongside sit the **car fleet**
(client-driven or with a hired driver who may need their own room), **price
variants**, and **inclusions** — per-person costs you absorb, and upsells you
charge for.

Rooms are worked out **per night**, so a traveller who joins late or leaves early
doesn't inflate the requirement on nights they aren't there.

**Bookings** — each party with its package split (land / visa / flights), GST and
TCS, discounts, per-traveller extras, cancellation terms and visa status. Tax
invoices are generated from here, numbered gaplessly per financial year.

**Payments** — who owes you, sorted by who owes most. Payment plans built from
reusable templates ("25% now, balance 21 days before travel"), WhatsApp reminders
in a tap, shareable payment links, and customer-uploaded payments that you
approve before they count.

**Costing** — every rupee out: supplier bills, fuel, salaries, ads. Tag a spend to
a whole trip or tick several specific items it covers, and the amount is split
between them by estimate. Marking a hotel, car or supplier **paid** writes the
expense for you. Money staff front from their own pocket is tracked as a **loan**
until a settlement pays it back. Full ledger at `/expenses/log`.

**Visa desk** — send one link, the traveller fills in their own details, you get
a cover letter and document checklist back with the trip's dates and hotels
already merged in.

**GST / Tax** — tax collected, tax remitted, what's still owed.

**Custom trips** — bespoke à-la-carte itineraries priced line by line. Off by
default; the platform admin switches it on per agency.

Also: team members with per-trip access, a recycle bin for anything deleted,
CSV export, dark mode, a guided tour (Settings → Guided tour), and the whole
thing installs to a phone home screen as an app.

---

## How it's built

- **Next.js 16** (App Router, Server Actions, `src/proxy.ts` middleware) + **React 19**
- **Prisma 6** + **PostgreSQL** (Neon in production)
- **Vitest** for the money maths
- Deployed on **Vercel**

Neon has no shadow database, so migrations are hand-written SQL under
`prisma/migrations/` and applied with `prisma migrate deploy` (which the build
script runs). Don't reach for `prisma migrate dev` against production.

### Where the important logic lives

| File | What it owns |
| --- | --- |
| `src/lib/calc.ts` | Booking totals, GST/TCS, trip profit, room and seat coverage, gap detection |
| `src/lib/schedule.ts` | Payment plan maths, and `apportion()` for splitting one bill across items |
| `src/lib/scope.ts` | Org + per-trip access scoping — every query goes through it |
| `src/lib/org.ts` | Session → org context, including the platform admin viewing a client |
| `src/proxy.ts` | Public vs authenticated routes, canonical host redirect |

**Money is whole rupees (`Int`) everywhere.** No floats, no minor units.

A few rules worth knowing before changing the maths:

- **The invoice is the truth, the payment plan is only a schedule for collecting
  it.** A plan's steps are capped at the invoice total, so a stale plan can never
  show a customer as owing more than their bill.
- **A room counts as secured** when its status is `hold`, `final` *or* `paid` —
  `isBookedStatus()` owns that list. Adding a status without going through it
  silently turns paid-for hotels into unbooked nights.
- **A night dated 4 Oct is the night you sleep into 5 Oct**, so a stay covers a
  night when `stayStart <= night.date < stayEnd`.

### Multi-tenancy

New agencies sign up in status `pending` and stay dark until approved from
`/admin`. See [MULTITENANCY.md](MULTITENANCY.md) for the data isolation model.

### Environment variables

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | Postgres connection |
| `AUTH_SECRET` | Signing the session cookie — must be long and random |
| `RESEND_API_KEY` | Sending password-reset email |
| `MAIL_FROM` | e.g. `TripZei <no-reply@mail.tripzei.com>` — domain must be verified in Resend |
| `APP_URL` | Absolute links in outbound email |
| `CANONICAL_HOST` | Redirects `*.vercel.app` to the real domain (default `tripzei.com`) |
| `TURNSTILE_SECRET_KEY` | Bot check on signup — skipped entirely when unset, so local dev just works |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error reporting |

Without `RESEND_API_KEY` nothing is emailed: the message is written to the server
log instead, so a locked-out admin can still recover the reset link.

---

## Loose ends

Honest list of things that are stale rather than finished:

- **`prisma/seed.ts` creates `admin@travel.local` / `travel123`.** It predates
  self-service signup and that password is far too weak to survive contact with
  anything real. Use `npm run db:demo` for local data; this seed should be cut
  down or removed.
- **`src/lib/chat.ts` and `src/components/ChatBox.tsx` are orphaned.** The
  plain-English command box isn't mounted on any page — Quick add replaced it.
  Either wire it back up or delete both.
- **Everything is priced in rupees and GST is assumed.** The marketing site is
  country-neutral but the app is not; currency and tax regime need to become
  per-org settings before selling outside India.
