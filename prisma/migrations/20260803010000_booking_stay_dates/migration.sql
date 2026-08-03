-- Per-booking stay window, so a traveller who joins late or leaves early stops
-- counting toward the rooms needed on nights they aren't there.
-- NULL means "the whole trip", so every existing booking is unaffected.
ALTER TABLE "Booking" ADD COLUMN "stayStart" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "stayEnd" TIMESTAMP(3);
