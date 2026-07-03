-- Long-term (multiple-entry) visa request + travelling-with (companions).
ALTER TABLE "VisaApplicant" ADD COLUMN "wantsLongTerm" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VisaApplicant" ADD COLUMN "travellingWith" TEXT;
