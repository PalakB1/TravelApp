-- Lets a paid workspace remove the "Powered by TripZei" line from the documents
-- its customers receive. Defaults to showing it.
ALTER TABLE "Organization" ADD COLUMN "hideBranding" BOOLEAN NOT NULL DEFAULT false;
