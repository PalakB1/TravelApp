-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "variantId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "pax" INTEGER NOT NULL DEFAULT 1,
    "packageType" TEXT NOT NULL DEFAULT 'land',
    "landAmount" INTEGER NOT NULL DEFAULT 0,
    "visaAmount" INTEGER NOT NULL DEFAULT 0,
    "flightAmount" INTEGER NOT NULL DEFAULT 0,
    "nonTaxable" INTEGER NOT NULL DEFAULT 0,
    "gstRate" INTEGER NOT NULL DEFAULT 5,
    "tcsRate" INTEGER NOT NULL DEFAULT 2,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "notes" TEXT,
    "taxRemitted" BOOLEAN NOT NULL DEFAULT false,
    "taxRemittedOn" DATETIME,
    "taxRemittedNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "customerId", "customerName", "customerPhone", "discount", "discountReason", "flightAmount", "gstRate", "id", "landAmount", "nonTaxable", "notes", "packageType", "pax", "status", "tcsRate", "tripId", "variantId", "visaAmount") SELECT "createdAt", "customerId", "customerName", "customerPhone", "discount", "discountReason", "flightAmount", "gstRate", "id", "landAmount", "nonTaxable", "notes", "packageType", "pax", "status", "tcsRate", "tripId", "variantId", "visaAmount" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
