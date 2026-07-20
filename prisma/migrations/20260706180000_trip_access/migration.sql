-- Per-trip team access. ADDITIVE — everyone stays unrestricted by default.
ALTER TABLE "User" ADD COLUMN "tripScoped" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TripAccess" (
    "id"     TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    CONSTRAINT "TripAccess_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TripAccess_userId_tripId_key" ON "TripAccess"("userId", "tripId");
CREATE INDEX "TripAccess_userId_idx" ON "TripAccess"("userId");
CREATE INDEX "TripAccess_tripId_idx" ON "TripAccess"("tripId");

ALTER TABLE "TripAccess" ADD CONSTRAINT "TripAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripAccess" ADD CONSTRAINT "TripAccess_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
