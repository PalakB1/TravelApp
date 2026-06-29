-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "nights" INTEGER NOT NULL DEFAULT 0,
    "days" INTEGER NOT NULL DEFAULT 0,
    "departureDate" DATETIME,
    "endDate" DATETIME,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "maxPerRoom" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Trip" ("capacity", "createdAt", "days", "departureDate", "destination", "endDate", "id", "name", "nights", "notes") SELECT "capacity", "createdAt", "days", "departureDate", "destination", "endDate", "id", "name", "nights", "notes" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
