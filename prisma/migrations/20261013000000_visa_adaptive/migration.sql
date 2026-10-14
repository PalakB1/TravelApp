-- The adaptive visa form: the questions an embassy's answer depends on.
--
-- All nullable, no defaults changed, nothing existing rewritten — an applicant
-- filled before today simply has these empty, and the checklist falls back to
-- the tourism wording it used before.

ALTER TABLE "VisaApplicant" ADD COLUMN "travelPurpose"     TEXT;  -- tourism | business | family
ALTER TABLE "VisaApplicant" ADD COLUMN "hostInvite"        TEXT;  -- company/host inviting, when it isn't plain tourism
ALTER TABLE "VisaApplicant" ADD COLUMN "mostNightsCountry" TEXT;  -- decides WHICH consulate may take the file
ALTER TABLE "VisaApplicant" ADD COLUMN "entryCountry"      TEXT;  -- tie-breaker when the nights are equal
ALTER TABLE "VisaApplicant" ADD COLUMN "minorParents"      TEXT;  -- both parents, when the applicant is under 18
