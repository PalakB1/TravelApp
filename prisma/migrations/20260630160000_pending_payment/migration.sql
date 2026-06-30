-- Customer-self-reported payments via the public link, pending operator approval.
CREATE TABLE "PendingPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'upi',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "screenshot" TEXT,
    "payerName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PendingPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PendingPayment_bookingId_idx" ON "PendingPayment"("bookingId");

ALTER TABLE "PendingPayment" ADD CONSTRAINT "PendingPayment_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
