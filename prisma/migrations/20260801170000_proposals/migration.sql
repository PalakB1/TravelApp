-- Pre-sale proposals/quotes. ADDITIVE — two new tables only.

CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled proposal',
    "destination" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "startDate" TIMESTAMP(3),
    "nights" INTEGER NOT NULL DEFAULT 0,
    "pax" INTEGER NOT NULL DEFAULT 1,
    "heroNote" TEXT,
    "coverImage" TEXT,
    "priceAmount" INTEGER NOT NULL DEFAULT 0,
    "pricePerPerson" BOOLEAN NOT NULL DEFAULT false,
    "inclusions" TEXT,
    "exclusions" TEXT,
    "terms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Proposal_orgId_idx" ON "Proposal"("orgId");

CREATE TABLE "ProposalDay" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProposalDay_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProposalDay_proposalId_idx" ON "ProposalDay"("proposalId");

ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProposalDay" ADD CONSTRAINT "ProposalDay_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
