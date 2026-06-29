-- Per-traveller extra charge (single-room supplement, upgrade for one person, …),
-- summed onto the booking as a flat taxable add-on.
ALTER TABLE "Traveller" ADD COLUMN "extraCharge" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Traveller" ADD COLUMN "extraNote" TEXT;
ALTER TABLE "Booking" ADD COLUMN "travellerExtra" INTEGER NOT NULL DEFAULT 0;
