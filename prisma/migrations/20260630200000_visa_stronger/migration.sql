-- Stronger visa applications: employment type + business docs, travel history,
-- dependents staying home, and investments (ties + financial roots).
ALTER TABLE "VisaApplicant" ADD COLUMN "employmentType" TEXT DEFAULT 'employed';
ALTER TABLE "VisaApplicant" ADD COLUMN "gstNo" TEXT;
ALTER TABLE "VisaApplicant" ADD COLUMN "travelHistory" TEXT;
ALTER TABLE "VisaApplicant" ADD COLUMN "dependents" TEXT;
ALTER TABLE "VisaApplicant" ADD COLUMN "investments" TEXT;
