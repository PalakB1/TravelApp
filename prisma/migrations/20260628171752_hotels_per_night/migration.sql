/*
  Warnings:

  - You are about to drop the column `confirmationNo` on the `Night` table. All the data in the column will be lost.
  - You are about to drop the column `cost` on the `Night` table. All the data in the column will be lost.
  - You are about to drop the column `holdUntil` on the `Night` table. All the data in the column will be lost.
  - You are about to drop the column `hotelName` on the `Night` table. All the data in the column will be lost.
  - You are about to drop the column `rooms` on the `Night` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Night` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Night` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "endDate" DATETIME;

-- CreateTable
CREATE TABLE "HotelBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nightId" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "rooms" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'hold',
    "holdUntil" DATETIME,
    "source" TEXT,
    "confirmationNo" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelBooking_nightId_fkey" FOREIGN KEY ("nightId") REFERENCES "Night" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Night" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "date" DATETIME,
    "location" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Night_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Night" ("createdAt", "date", "id", "location", "notes", "order", "tripId") SELECT "createdAt", "date", "id", "location", "notes", "order", "tripId" FROM "Night";
DROP TABLE "Night";
ALTER TABLE "new_Night" RENAME TO "Night";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
