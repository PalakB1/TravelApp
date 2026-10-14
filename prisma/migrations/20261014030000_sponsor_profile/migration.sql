-- The sponsor as a person in their own right.
--
-- A sponsored application is really two applications: the traveller's, and the
-- sponsor's proof that they can pay for it. Knowing only the sponsor's name and
-- relationship meant the sponsor's half of the file couldn't be listed at all —
-- whether they're salaried or run a company decides four or five documents.

ALTER TABLE "VisaApplicant" ADD COLUMN "sponsorWork"     TEXT; -- employed | business | self | retired | other
ALTER TABLE "VisaApplicant" ADD COLUMN "sponsorEmployer" TEXT; -- their company, or who they work for
ALTER TABLE "VisaApplicant" ADD COLUMN "sponsorGst"      TEXT; -- their company's GST / registration no.
ALTER TABLE "VisaApplicant" ADD COLUMN "sponsorIncome"   TEXT;
