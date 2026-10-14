-- The questions an embassy weighs before it weighs anything else.
--
-- A previous refusal, an overstay or an entry ban is checked automatically
-- against the Schengen Information System whatever the applicant writes, so the
-- only thing not declaring it achieves is turning a survivable history into a
-- false statement. Better to know on day one and write the explanation
-- ourselves.

ALTER TABLE "VisaApplicant" ADD COLUMN "visaRefusals"   TEXT; -- refused by any country, ever
ALTER TABLE "VisaApplicant" ADD COLUMN "entryIssues"    TEXT; -- overstay, deportation, refused entry, ban
ALTER TABLE "VisaApplicant" ADD COLUMN "criminalRecord" TEXT; -- convictions or pending cases, anywhere
