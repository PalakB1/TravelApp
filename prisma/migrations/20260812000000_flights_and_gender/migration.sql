-- Per-booking flight times (for airport transfers and first/last night timing)
-- and per-traveller gender (for rooming). All optional — nothing existing changes.

ALTER TABLE "Booking" ADD COLUMN "arriveAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "departAt" TIMESTAMP(3);
ALTER TABLE "Traveller" ADD COLUMN "gender" TEXT;
