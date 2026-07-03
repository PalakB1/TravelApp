-- Schengen visa applicants (public form per trip) → cover letter + checklist.
CREATE TABLE "VisaApplicant" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "placeOfBirth" TEXT,
    "nationality" TEXT DEFAULT 'Indian',
    "maritalStatus" TEXT,
    "passportNo" TEXT,
    "passportIssue" TIMESTAMP(3),
    "passportExpiry" TIMESTAMP(3),
    "passportPlace" TEXT,
    "address" TEXT,
    "city" TEXT,
    "pin" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "occupation" TEXT,
    "employer" TEXT,
    "employerAddress" TEXT,
    "income" TEXT,
    "funding" TEXT DEFAULT 'self',
    "sponsorName" TEXT,
    "sponsorRelation" TEXT,
    "prevSchengen" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisaApplicant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VisaApplicant_tripId_idx" ON "VisaApplicant"("tripId");

ALTER TABLE "VisaApplicant" ADD CONSTRAINT "VisaApplicant_tripId_fkey"
    FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
