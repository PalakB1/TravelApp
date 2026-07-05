-- Custom trips module. ADDITIVE ONLY (ADD COLUMN + CREATE TABLE). No data touched.

ALTER TABLE "Organization" ADD COLUMN "customTripsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CustomTrip" (
    "id"          TEXT NOT NULL,
    "orgId"       TEXT NOT NULL,
    "customerId"  TEXT,
    "clientName"  TEXT NOT NULL,
    "clientPhone" TEXT,
    "title"       TEXT NOT NULL DEFAULT 'Custom trip',
    "startDate"   TIMESTAMP(3),
    "endDate"     TIMESTAMP(3),
    "status"      TEXT NOT NULL DEFAULT 'enquiry',
    "discount"    INTEGER NOT NULL DEFAULT 0,
    "gstRate"     INTEGER NOT NULL DEFAULT 5,
    "tcsRate"     INTEGER NOT NULL DEFAULT 2,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomTrip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomItem" (
    "id"           TEXT NOT NULL,
    "customTripId" TEXT NOT NULL,
    "type"         TEXT NOT NULL DEFAULT 'other',
    "description"  TEXT NOT NULL,
    "supplier"     TEXT,
    "date"         TIMESTAMP(3),
    "qty"          INTEGER NOT NULL DEFAULT 1,
    "cost"         INTEGER NOT NULL DEFAULT 0,
    "sell"         INTEGER NOT NULL DEFAULT 0,
    "taxable"      BOOLEAN NOT NULL DEFAULT true,
    "notes"        TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomPayment" (
    "id"           TEXT NOT NULL,
    "customTripId" TEXT NOT NULL,
    "amount"       INTEGER NOT NULL,
    "date"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode"         TEXT NOT NULL DEFAULT 'upi',
    "note"         TEXT,
    CONSTRAINT "CustomPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomTrip_orgId_idx"          ON "CustomTrip"("orgId");
CREATE INDEX "CustomTrip_customerId_idx"     ON "CustomTrip"("customerId");
CREATE INDEX "CustomItem_customTripId_idx"   ON "CustomItem"("customTripId");
CREATE INDEX "CustomPayment_customTripId_idx" ON "CustomPayment"("customTripId");

ALTER TABLE "CustomTrip"    ADD CONSTRAINT "CustomTrip_orgId_fkey"          FOREIGN KEY ("orgId")       REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomTrip"    ADD CONSTRAINT "CustomTrip_customerId_fkey"     FOREIGN KEY ("customerId")  REFERENCES "Customer"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomItem"    ADD CONSTRAINT "CustomItem_customTripId_fkey"   FOREIGN KEY ("customTripId") REFERENCES "CustomTrip"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomPayment" ADD CONSTRAINT "CustomPayment_customTripId_fkey" FOREIGN KEY ("customTripId") REFERENCES "CustomTrip"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
