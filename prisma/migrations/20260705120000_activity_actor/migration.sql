-- Audit attribution on ActivityLog. ADDITIVE ONLY (ADD COLUMN, no data touched).
ALTER TABLE "ActivityLog" ADD COLUMN "userId"      TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "userName"    TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "actingAdmin" BOOLEAN NOT NULL DEFAULT false;
