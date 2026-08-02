-- Reusable payment plan templates. ADDITIVE — two new tables only.

CREATE TABLE "PaymentPlanTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentPlanTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentPlanTemplate_orgId_idx" ON "PaymentPlanTemplate"("orgId");

CREATE TABLE "PaymentPlanTemplateStep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Installment',
    "kind" TEXT NOT NULL DEFAULT 'percent',
    "percent" INTEGER,
    "amount" INTEGER,
    "daysBeforeTravel" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaymentPlanTemplateStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentPlanTemplateStep_templateId_idx" ON "PaymentPlanTemplateStep"("templateId");

ALTER TABLE "PaymentPlanTemplate" ADD CONSTRAINT "PaymentPlanTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentPlanTemplateStep" ADD CONSTRAINT "PaymentPlanTemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PaymentPlanTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
