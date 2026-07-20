-- Finer-grained costing: an expense can attach to a specific hotel booking or a
-- specific car (whose stored cost is only a hold/estimate), not just the trip.
-- ADDITIVE — two nullable columns + FKs, nothing dropped.
ALTER TABLE "Expense" ADD COLUMN "hotelId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "carId" TEXT;
CREATE INDEX "Expense_hotelId_idx" ON "Expense"("hotelId");
CREATE INDEX "Expense_carId_idx" ON "Expense"("carId");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
