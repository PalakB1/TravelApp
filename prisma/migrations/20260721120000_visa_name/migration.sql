-- Visa form: capture surname + given name(s) separately (as printed in the
-- passport) so whoever fills the embassy form has them split, like every visa
-- application requires. ADDITIVE — fullName is kept (auto-composed). Nothing dropped.
ALTER TABLE "VisaApplicant" ADD COLUMN "surname" TEXT;
ALTER TABLE "VisaApplicant" ADD COLUMN "givenName" TEXT;
