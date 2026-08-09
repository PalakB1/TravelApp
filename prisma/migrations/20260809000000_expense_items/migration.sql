-- One expense can now pay for several things. Adds the join table and moves the
-- existing single hotelId/carId links onto it, so nothing already logged is lost.
-- The old Expense.hotelId / Expense.carId columns are left in place but are no
-- longer read: dropping them would make this migration irreversible for no gain.

CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "hotelId" TEXT,
    "carId" TEXT,
    "vendorId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExpenseItem_expenseId_idx" ON "ExpenseItem"("expenseId");
CREATE INDEX "ExpenseItem_hotelId_idx" ON "ExpenseItem"("hotelId");
CREATE INDEX "ExpenseItem_carId_idx" ON "ExpenseItem"("carId");
CREATE INDEX "ExpenseItem_vendorId_idx" ON "ExpenseItem"("vendorId");

ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_expenseId_fkey"
    FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_hotelId_fkey"
    FOREIGN KEY ("hotelId") REFERENCES "HotelBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_carId_fkey"
    FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "VendorBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every expense currently pinned to one hotel or one car becomes a
-- single link carrying the whole amount.
INSERT INTO "ExpenseItem" ("id", "expenseId", "hotelId", "amount")
SELECT gen_random_uuid()::text, "id", "hotelId", "amount"
FROM "Expense" WHERE "hotelId" IS NOT NULL;

INSERT INTO "ExpenseItem" ("id", "expenseId", "carId", "amount")
SELECT gen_random_uuid()::text, "id", "carId", "amount"
FROM "Expense" WHERE "carId" IS NOT NULL AND "hotelId" IS NULL;
