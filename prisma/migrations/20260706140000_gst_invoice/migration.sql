-- GST tax-invoice support. ADDITIVE — add columns + new counter table.
ALTER TABLE "Organization" ADD COLUMN "legalName"    TEXT;
ALTER TABLE "Organization" ADD COLUMN "gstin"        TEXT;
ALTER TABLE "Organization" ADD COLUMN "gstAddress"   TEXT;
ALTER TABLE "Organization" ADD COLUMN "gstState"     TEXT;
ALTER TABLE "Organization" ADD COLUMN "gstStateCode" TEXT;
ALTER TABLE "Organization" ADD COLUMN "sacCode"      TEXT DEFAULT '998555';
ALTER TABLE "Organization" ADD COLUMN "invoiceNote"  TEXT;

ALTER TABLE "Booking" ADD COLUMN "invoiceNo"   TEXT;
ALTER TABLE "Booking" ADD COLUMN "invoiceDate" TIMESTAMP(3);

CREATE TABLE "InvoiceSeq" (
    "id"     TEXT NOT NULL,
    "orgId"  TEXT NOT NULL,
    "fy"     TEXT NOT NULL,
    "lastNo" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InvoiceSeq_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InvoiceSeq_orgId_fy_key" ON "InvoiceSeq"("orgId", "fy");
