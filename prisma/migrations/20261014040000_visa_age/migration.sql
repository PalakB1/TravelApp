-- Age, asked outright.
--
-- The date of birth came off the form because the passport copy carries it, but
-- age decides things before any passport is seen: under 18 and the file needs
-- consent from both parents, notarised, which is the longest-lead document on
-- the whole list. Asking for one number gets that moving on day one.

ALTER TABLE "VisaApplicant" ADD COLUMN "age" INTEGER;
