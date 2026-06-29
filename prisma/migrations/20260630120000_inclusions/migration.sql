-- Inclusions module: defaults + taxable flag on Inclusion, per-person inclusion
-- sums on Booking, and a BookingInclusion table (price/date snapshots).

ALTER TABLE "Inclusion" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Inclusion" ADD COLUMN "taxable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Inclusion" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Booking" ADD COLUMN "inclCostPP" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "inclTaxPP" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "inclNonTaxPP" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "BookingInclusion" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "inclusionId" TEXT,
    "name" TEXT NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "charge" INTEGER NOT NULL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingInclusion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingInclusion_bookingId_idx" ON "BookingInclusion"("bookingId");

ALTER TABLE "BookingInclusion" ADD CONSTRAINT "BookingInclusion_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingInclusion" ADD CONSTRAINT "BookingInclusion_inclusionId_fkey"
    FOREIGN KEY ("inclusionId") REFERENCES "Inclusion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
