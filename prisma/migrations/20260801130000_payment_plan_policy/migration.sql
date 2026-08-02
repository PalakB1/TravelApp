-- Payment plans + cancellation/refund policy. ADDITIVE — new columns and one new
-- table only; existing rows are unaffected (columns default to NULL).

-- Organization: default refund/cancellation terms that auto-fill new bookings.
ALTER TABLE "Organization" ADD COLUMN "defaultRefundPolicy" TEXT;

-- Booking: per-booking policy text + the free-cancellation deadline.
ALTER TABLE "Booking" ADD COLUMN "refundPolicy" TEXT;
ALTER TABLE "Booking" ADD COLUMN "freeCancelUntil" TIMESTAMP(3);

-- The payment plan: planned installments per booking.
CREATE TABLE "PaymentScheduleItem" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Installment',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentScheduleItem_bookingId_idx" ON "PaymentScheduleItem"("bookingId");
CREATE INDEX "PaymentScheduleItem_dueDate_idx" ON "PaymentScheduleItem"("dueDate");

ALTER TABLE "PaymentScheduleItem" ADD CONSTRAINT "PaymentScheduleItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
