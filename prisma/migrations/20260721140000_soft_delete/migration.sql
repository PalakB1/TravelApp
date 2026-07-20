-- Recycle bin: soft-delete instead of destroying data. A "deleted" record just
-- gets a deletedAt stamp and is hidden everywhere; it can be restored from the
-- bin. ADDITIVE — nullable columns only, nothing dropped. Existing rows stay live
-- (deletedAt NULL). Directly serves the "never lose data" rule.
ALTER TABLE "Trip" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Expense" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "CustomTrip" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Trip_deletedAt_idx" ON "Trip"("deletedAt");
CREATE INDEX "Booking_deletedAt_idx" ON "Booking"("deletedAt");
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");
CREATE INDEX "Expense_deletedAt_idx" ON "Expense"("deletedAt");
CREATE INDEX "CustomTrip_deletedAt_idx" ON "CustomTrip"("deletedAt");
