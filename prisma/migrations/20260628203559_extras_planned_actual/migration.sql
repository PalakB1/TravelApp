-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VendorBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'activity',
    "vendorName" TEXT NOT NULL,
    "detail" TEXT,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "actualCost" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmationNo" TEXT,
    "date" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorBooking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VendorBooking" ("confirmationNo", "cost", "createdAt", "date", "detail", "id", "status", "tripId", "type", "vendorName") SELECT "confirmationNo", "cost", "createdAt", "date", "detail", "id", "status", "tripId", "type", "vendorName" FROM "VendorBooking";
DROP TABLE "VendorBooking";
ALTER TABLE "new_VendorBooking" RENAME TO "VendorBooking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
