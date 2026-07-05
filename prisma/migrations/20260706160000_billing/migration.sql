-- Billing plans + 30-day trial. ADDITIVE.
ALTER TABLE "Organization" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE "Organization" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
-- Grandfather every existing org (founders) onto Business, with no trial expiry.
UPDATE "Organization" SET "plan" = 'business' WHERE "plan" = 'trial';
