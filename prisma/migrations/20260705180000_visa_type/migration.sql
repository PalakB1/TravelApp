-- Visa type on the applicant (chosen when the link is shared). ADDITIVE.
ALTER TABLE "VisaApplicant" ADD COLUMN "visaType"    TEXT DEFAULT 'schengen';
ALTER TABLE "VisaApplicant" ADD COLUMN "visaCountry" TEXT;
-- Existing records were all Schengen.
UPDATE "VisaApplicant" SET "visaType" = 'schengen' WHERE "visaType" IS NULL;
