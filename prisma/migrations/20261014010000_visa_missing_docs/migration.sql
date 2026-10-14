-- What the traveller says they can't lay their hands on.
--
-- The form now shows the document list while it is being filled, and asks the
-- traveller to tick what they already have. What they leave unticked is the
-- agency's actual workload, and it is worth knowing before a file is promised
-- rather than three weeks into chasing it.

ALTER TABLE "VisaApplicant" ADD COLUMN "missingDocs" TEXT;
