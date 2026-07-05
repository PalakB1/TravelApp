-- Landing-page lead capture. ADDITIVE — new table only.
CREATE TABLE "Lead" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "source"    TEXT DEFAULT 'landing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
