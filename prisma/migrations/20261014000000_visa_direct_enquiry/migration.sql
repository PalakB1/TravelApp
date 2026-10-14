-- The agency's permanent visa link: an application that arrives without a trip.
--
-- Until now every visa form hung off a trip, which is where it read the dates,
-- the destination and the hotels from. A traveller filling the agency's own link
-- has none of that yet, so they name their destination and dates themselves and
-- the application belongs to the ORG rather than to a trip.
--
-- tripId becomes nullable. Existing rows keep their trip and are given the org
-- that trip already belongs to, so nothing changes about who can see them.

ALTER TABLE "VisaApplicant" ALTER COLUMN "tripId" DROP NOT NULL;

ALTER TABLE "VisaApplicant" ADD COLUMN "orgId"            TEXT;
ALTER TABLE "VisaApplicant" ADD COLUMN "travelFrom"       TIMESTAMP(3);
ALTER TABLE "VisaApplicant" ADD COLUMN "travelTo"         TIMESTAMP(3);
ALTER TABLE "VisaApplicant" ADD COLUMN "residenceCountry" TEXT;

-- Derived, not invented: every existing applicant's org is the org of its trip.
UPDATE "VisaApplicant" a
   SET "orgId" = t."orgId"
  FROM "Trip" t
 WHERE a."tripId" = t."id"
   AND a."orgId" IS NULL;

ALTER TABLE "VisaApplicant"
  ADD CONSTRAINT "VisaApplicant_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "VisaApplicant_orgId_idx" ON "VisaApplicant"("orgId");
