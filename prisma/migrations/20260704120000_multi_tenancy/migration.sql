-- MULTI-TENANCY FOUNDATION
-- ADDITIVE ONLY. There is no DELETE, DROP, TRUNCATE, or reset anywhere in this file.
-- Existing rows are never removed; they only gain a new "orgId" column that we then
-- backfill to a single default organization so nothing is orphaned.

-- 1) New table for organizations (touches nothing existing).
CREATE TABLE "Organization" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'pending',           -- pending | approved | rejected | suspended
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- 2) Add new (empty) columns to existing tables. Existing rows are untouched —
--    they simply gain a nullable "orgId" (and the User gains "isPlatformAdmin").
ALTER TABLE "User"        ADD COLUMN "orgId" TEXT;
ALTER TABLE "User"        ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Trip"        ADD COLUMN "orgId" TEXT;
ALTER TABLE "Customer"    ADD COLUMN "orgId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "orgId" TEXT;

-- 3) Create ONE default organization, already approved, to own all existing data.
INSERT INTO "Organization" ("id", "name", "status", "createdAt")
VALUES ('org_default_0001', 'Trip Desk', 'approved', CURRENT_TIMESTAMP);

-- 4) Backfill: point every existing row at the default org. This WRITES the new
--    column on rows that currently have NULL — it removes nothing.
UPDATE "Trip"        SET "orgId" = 'org_default_0001' WHERE "orgId" IS NULL;
UPDATE "Customer"    SET "orgId" = 'org_default_0001' WHERE "orgId" IS NULL;
UPDATE "ActivityLog" SET "orgId" = 'org_default_0001' WHERE "orgId" IS NULL;
UPDATE "User"        SET "orgId" = 'org_default_0001' WHERE "orgId" IS NULL;

-- 5) Make the existing admin account the platform admin (org approver).
UPDATE "User" SET "isPlatformAdmin" = true WHERE "email" = 'admin@travel.local';

-- 6) Indexes on the new columns (for scoped lookups).
CREATE INDEX "User_orgId_idx"        ON "User"("orgId");
CREATE INDEX "Trip_orgId_idx"        ON "Trip"("orgId");
CREATE INDEX "Customer_orgId_idx"    ON "Customer"("orgId");
CREATE INDEX "ActivityLog_orgId_idx" ON "ActivityLog"("orgId");

-- 7) Foreign keys linking the new columns to Organization.
--    ON DELETE SET NULL is the NON-destructive choice: even if an org row were ever
--    removed, the trip/customer/log/user rows SURVIVE — their orgId just goes NULL.
ALTER TABLE "User"        ADD CONSTRAINT "User_orgId_fkey"        FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Trip"        ADD CONSTRAINT "Trip_orgId_fkey"        FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Customer"    ADD CONSTRAINT "Customer_orgId_fkey"    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
