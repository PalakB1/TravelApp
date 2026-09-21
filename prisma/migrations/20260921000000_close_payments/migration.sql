-- Closing a booking's payments: accepting that a small remaining balance will
-- never arrive. The balance stays on the record; the booking just stops being
-- chased. All optional, so nothing existing changes.

ALTER TABLE "Booking" ADD COLUMN "paymentsClosedAt"   TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "paymentsClosedBy"   TEXT;
ALTER TABLE "Booking" ADD COLUMN "paymentsClosedNote" TEXT;
