-- Company-level admin. Lets an agency manage its own team instead of asking us.
ALTER TABLE "User" ADD COLUMN "isOrgAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: whoever signed the company up (its earliest member) becomes its
-- admin, so no existing workspace is left with nobody able to manage the team.
UPDATE "User" u
SET "isOrgAdmin" = true
WHERE u."orgId" IS NOT NULL
  AND u."id" = (
    SELECT u2."id" FROM "User" u2
    WHERE u2."orgId" = u."orgId"
    ORDER BY u2."createdAt" ASC, u2."id" ASC
    LIMIT 1
  );
