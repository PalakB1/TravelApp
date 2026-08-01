-- DropForeignKey
ALTER TABLE "CustomTrip" DROP CONSTRAINT "CustomTrip_orgId_fkey";

-- DropIndex
DROP INDEX "BookingInclusion_bookingId_idx";

-- DropIndex
DROP INDEX "Expense_carId_idx";

-- DropIndex
DROP INDEX "Expense_hotelId_idx";

-- DropIndex
DROP INDEX "PendingPayment_bookingId_idx";

-- DropIndex
DROP INDEX "PendingPayment_tripId_idx";

-- DropIndex
DROP INDEX "VisaApplicant_tripId_idx";

-- AlterTable
ALTER TABLE "ActivityLog" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Car" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CustomItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CustomTrip" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "paidBy" TEXT,
ADD COLUMN     "paidPersonally" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "settlementId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HotelBooking" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Inclusion" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Night" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PendingPayment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Traveller" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Trip" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VendorBooking" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VisaApplicant" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "bankName" TEXT,
    "paidTo" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Settlement_orgId_idx" ON "Settlement"("orgId");

-- CreateIndex
CREATE INDEX "Expense_settlementId_idx" ON "Expense"("settlementId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomTrip" ADD CONSTRAINT "CustomTrip_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
