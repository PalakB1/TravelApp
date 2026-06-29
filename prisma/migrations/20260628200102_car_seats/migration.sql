-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Car" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Car',
    "carType" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 0,
    "vendor" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "rentalCost" INTEGER NOT NULL DEFAULT 0,
    "driverMode" TEXT NOT NULL DEFAULT 'self',
    "driverCost" INTEGER NOT NULL DEFAULT 0,
    "driverNeedsStay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'hold',
    "holdUntil" DATETIME,
    "source" TEXT,
    "confirmationNo" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Car_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Car" ("carType", "confirmationNo", "createdAt", "driverCost", "driverMode", "driverNeedsStay", "endDate", "holdUntil", "id", "label", "notes", "rentalCost", "source", "startDate", "status", "tripId", "vendor") SELECT "carType", "confirmationNo", "createdAt", "driverCost", "driverMode", "driverNeedsStay", "endDate", "holdUntil", "id", "label", "notes", "rentalCost", "source", "startDate", "status", "tripId", "vendor" FROM "Car";
DROP TABLE "Car";
ALTER TABLE "new_Car" RENAME TO "Car";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
