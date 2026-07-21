-- Per-customer visa tracking on each booking: status (required → approved…),
-- who handles it (agency vs the customer), and — for held/approved visas — the
-- date it's valid until. ADDITIVE — new columns only, existing rows default to
-- "not_required". Nothing dropped.
ALTER TABLE "Booking" ADD COLUMN "visaStatus" TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE "Booking" ADD COLUMN "visaHandledBy" TEXT;
ALTER TABLE "Booking" ADD COLUMN "visaValidUntil" TIMESTAMP(3);
