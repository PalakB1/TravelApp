-- Two things: a label for trips built for one group, and quotations.
--
-- The separate "Custom trips" module was the wrong shape — a private group trip
-- needs everything an ordinary trip has, so it IS an ordinary trip, just marked
-- as one. Nothing existing changes: every current trip is isCustom = false.
--
-- A quotation is what goes out before anyone has agreed to anything. It carries
-- its own line items rather than reading them off a booking, because at quoting
-- time the shape of the trip is still being argued about. Tax is copied onto the
-- quote when it is made, so one sent in March still adds up in June.

ALTER TABLE "Trip" ADD COLUMN "isCustom" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Quotation" (
  "id"          TEXT NOT NULL,
  "orgId"       TEXT NOT NULL,
  "tripId"      TEXT,
  "quoteNo"     TEXT,
  "title"       TEXT NOT NULL DEFAULT 'Trip quotation',
  "clientName"  TEXT NOT NULL,
  "clientPhone" TEXT,
  "clientEmail" TEXT,
  "pax"         INTEGER NOT NULL DEFAULT 1,
  "validUntil"  TIMESTAMP(3),
  "notes"       TEXT,
  "status"      TEXT NOT NULL DEFAULT 'draft',
  "taxLabel"    TEXT NOT NULL DEFAULT 'GST',
  "taxRate"     INTEGER NOT NULL DEFAULT 5,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "deletedAt"   TIMESTAMP(3),
  CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuotationItem" (
  "id"          TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "detail"      TEXT,
  "qty"         INTEGER NOT NULL DEFAULT 1,
  "unitPrice"   INTEGER NOT NULL DEFAULT 0,
  "taxable"     BOOLEAN NOT NULL DEFAULT true,
  "order"       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteSeq" (
  "id"     TEXT NOT NULL,
  "orgId"  TEXT NOT NULL,
  "fy"     TEXT NOT NULL,
  "lastNo" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuoteSeq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Quotation_orgId_idx"           ON "Quotation"("orgId");
CREATE INDEX "Quotation_tripId_idx"          ON "Quotation"("tripId");
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
CREATE UNIQUE INDEX "QuoteSeq_orgId_fy_key"  ON "QuoteSeq"("orgId", "fy");

ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey"
  FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
