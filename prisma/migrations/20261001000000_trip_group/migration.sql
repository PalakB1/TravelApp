-- The trip's WhatsApp group: the invite link, and who has been sent it.
-- All optional; nothing existing changes.

ALTER TABLE "Trip" ADD COLUMN "groupLink"   TEXT;
ALTER TABLE "Trip" ADD COLUMN "groupLinkAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "groupInviteSentAt" TIMESTAMP(3);
