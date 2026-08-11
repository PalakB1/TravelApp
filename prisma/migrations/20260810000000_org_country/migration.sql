-- Currency and tax naming become per-agency, so the product works outside India.
-- Every existing organisation is Indian, and the column defaults match what the
-- app hardcoded before this, so nothing visibly changes for them.

ALTER TABLE "Organization" ADD COLUMN "country"    TEXT    NOT NULL DEFAULT 'IN';
ALTER TABLE "Organization" ADD COLUMN "currency"   TEXT    NOT NULL DEFAULT 'INR';
ALTER TABLE "Organization" ADD COLUMN "locale"     TEXT    NOT NULL DEFAULT 'en-IN';
ALTER TABLE "Organization" ADD COLUMN "taxLabel"   TEXT    NOT NULL DEFAULT 'GST';
ALTER TABLE "Organization" ADD COLUMN "taxRate"    INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Organization" ADD COLUMN "taxLabel2"  TEXT    NOT NULL DEFAULT 'TCS';
ALTER TABLE "Organization" ADD COLUMN "taxRate2"   INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Organization" ADD COLUMN "taxIdLabel" TEXT    NOT NULL DEFAULT 'GSTIN';
