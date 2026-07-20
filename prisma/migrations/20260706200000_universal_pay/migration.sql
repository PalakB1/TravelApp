-- Universal pay link privacy: pending payments can attach to a trip (unmatched)
-- instead of always a specific booking. ADDITIVE — bookingId becomes nullable.
ALTER TABLE "PendingPayment" ALTER COLUMN "bookingId" DROP NOT NULL;
ALTER TABLE "PendingPayment" ADD COLUMN "tripId" TEXT;
CREATE INDEX "PendingPayment_tripId_idx" ON "PendingPayment"("tripId");
ALTER TABLE "PendingPayment" ADD CONSTRAINT "PendingPayment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
