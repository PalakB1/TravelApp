-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "priceOverride" INTEGER;

-- CreateTable
CREATE TABLE "Night" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "date" DATETIME,
    "location" TEXT NOT NULL,
    "hotelName" TEXT,
    "rooms" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'unbooked',
    "holdUntil" DATETIME,
    "source" TEXT,
    "confirmationNo" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Night_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Car',
    "carType" TEXT,
    "vendor" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "rentalCost" INTEGER NOT NULL DEFAULT 0,
    "driverMode" TEXT NOT NULL DEFAULT 'self',
    "driverCost" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'hold',
    "holdUntil" DATETIME,
    "source" TEXT,
    "confirmationNo" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Car_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
