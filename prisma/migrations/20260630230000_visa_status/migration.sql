-- Visa desk: status + VFS appointment tracking.
ALTER TABLE "VisaApplicant" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'collecting';
ALTER TABLE "VisaApplicant" ADD COLUMN "appointmentAt" TIMESTAMP(3);
