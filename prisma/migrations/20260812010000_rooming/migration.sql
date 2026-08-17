-- Rooming: pair two travellers into a room, or flag one as needing a room alone.
-- Both sides of a pair are written by the app, so the unique FK below is what
-- keeps a "pair" from quietly becoming a crowd.

ALTER TABLE "Traveller" ADD COLUMN "roomWithId" TEXT;
ALTER TABLE "Traveller" ADD COLUMN "singleOccupancy" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Traveller_roomWithId_key" ON "Traveller"("roomWithId");

ALTER TABLE "Traveller" ADD CONSTRAINT "Traveller_roomWithId_fkey"
    FOREIGN KEY ("roomWithId") REFERENCES "Traveller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing free-text genders become the two values the dropdown now offers.
UPDATE "Traveller" SET "gender" = 'male'   WHERE lower("gender") IN ('male', 'm');
UPDATE "Traveller" SET "gender" = 'female' WHERE lower("gender") IN ('female', 'f');
UPDATE "Traveller" SET "gender" = NULL     WHERE "gender" IS NOT NULL AND "gender" NOT IN ('male', 'female');
