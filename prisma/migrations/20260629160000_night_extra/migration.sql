-- Add an "extra" flag to Night for add-on stays outside the core itinerary
-- (booked per customer need; no room requirement / "to book" count).
ALTER TABLE "Night" ADD COLUMN "extra" BOOLEAN NOT NULL DEFAULT false;
