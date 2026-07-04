# Multi-tenancy — build notes (branch: `multi-tenant`)

This branch turns Trip Desk into a platform many travel companies can use, each
with its own isolated data, plus a platform-admin console (you) to approve orgs.

**Status:** foundation committed (schema + migration). Migration NOT yet applied
to the database. No app code wired to orgs yet.

---

## ⚠️ DATA SAFETY — non-negotiable

The live Neon DB holds real business data. **In no way should this data be deleted.**

- NEVER run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push --force-reset`.
- Migrations must be **additive only**: `CREATE TABLE`, `ADD COLUMN`, `INSERT`,
  `UPDATE … SET`, `CREATE INDEX`, `ADD CONSTRAINT`. No DELETE / DROP / TRUNCATE.
- Apply with `npx prisma migrate deploy` (never `migrate dev` against prod).
- **Take a Neon backup/branch BEFORE applying** the migration.
- Foreign keys use `ON DELETE SET NULL` so rows survive even if an org is removed.

## Build & deploy rules

- `main` auto-deploys to Vercel (production). Do all this work on `multi-tenant`;
  merge to `main` only when it's complete and tested.
- **Do not push `multi-tenant` until you intend to apply the migration** — the
  Vercel build runs `prisma migrate deploy`, which would apply it to the live DB.
- Turbopack dev ignores TS errors; Vercel does not. **Always `npx next build`
  locally before pushing.** (A past type error froze deploys for 8 commits.)
- On Windows, stop the preview dev server before `npx prisma generate`
  (EPERM rename on the query-engine DLL otherwise).

---

## What's already in this branch

- `prisma/schema.prisma`: `Organization` model; nullable `orgId` on `Trip`,
  `Customer`, `ActivityLog`, `User`; `isPlatformAdmin` on `User`.
- `prisma/migrations/20260704120000_multi_tenancy/migration.sql`: additive
  migration — creates `Organization`, adds the columns, seeds one default org
  `org_default_0001` ("Trip Desk", approved), backfills all existing rows to it,
  makes `admin@travel.local` the platform admin, adds indexes + FKs.

## Apply order (when ready)

1. `git checkout multi-tenant`
2. Neon: create a backup branch of the DB.
3. `npx prisma migrate deploy`   (applies the additive migration)
4. Stop preview server, then `npx prisma generate`
5. Build the features below.
6. `npx next build` locally → then push → merge to `main`.

---

## Feature brief (paste into the fresh session as the first message)

**Goal:** multi-tenant Trip Desk with self-serve signup gated by admin approval,
a platform-admin console, equal access within an org, and strict data isolation.

**Model:** already added — `Organization { id, name, status(pending|approved|
rejected|suspended), createdAt }`. Existing data backfilled to `org_default_0001`.
`admin@travel.local` is the platform admin (`isPlatformAdmin = true`).

**Signup (public):**
- Public `/signup` page: company name, admin name, email, password.
- Creates an `Organization { status: "pending" }` + first `User` in that org.
- After signup, user sees a "pending approval" screen and CANNOT enter the app
  until an admin approves. Login for a pending/rejected org shows that state.

**Auth changes (`src/lib/auth.ts`, `src/proxy.ts`):**
- Put `orgId` and `isPlatformAdmin` in the JWT session.
- Gate `(app)` routes: session required AND the user's org must be `approved`
  (platform admin bypasses org checks).
- Add `/signup` to `PUBLIC_PATHS`.

**Platform-admin console (only for `isPlatformAdmin`):**
- `/admin` (or `/platform`): list all orgs with status, user count, created date.
- Approve / reject / suspend actions.
- "Enter this org" — navigate into that org's dashboard (impersonate/scope as
  that org) to see/help. Keep it clearly reversible ("exit to admin").

**Data isolation (the big one):**
- Every read/write for trips, customers, bookings, payments, visas, activity
  logs, inclusions, etc. must be scoped to the current user's `orgId`.
- Trip/Customer/ActivityLog carry `orgId` directly → filter `where: { orgId }`.
- Booking/Payment/Traveller/Night/Car/Inclusion/VendorBooking/VisaApplicant are
  scoped **through their Trip** (or Booking→Trip). Filter via the relation, e.g.
  `where: { trip: { orgId } }`, or add `orgId` to those tables too if simpler.
- Add a single helper (e.g. `getOrgId()` from session) and thread it through
  every query and every server action in `src/app/(app)/data-actions.ts`.
- Public links (`/pay/[bookingId]`, `/visa/[tripId]`, `/visa/checklist/[id]`)
  resolve the org from the booking/trip — no session, but still correct org.

**Equal access:** all users in an org have the same permissions (no roles yet).

**Verification checklist:**
- Create a 2nd org, confirm it sees NONE of org_default_0001's data and vice versa.
- Pending org cannot log in to the app.
- Platform admin can approve and enter an org.
- Existing data still fully visible under the default org (nothing lost).
- `npx next build` passes before pushing.
