-- Church-wide Team QR + referred-by attribution on outreach / follow-up

ALTER TABLE "evangelist_qr_codes" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "evangelist_qr_codes" ADD COLUMN IF NOT EXISTS "isChurchWide" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "evangelist_qr_codes_churchId_isChurchWide_idx" ON "evangelist_qr_codes"("churchId", "isChurchWide");

ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "referredBy" TEXT;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "referredBy" TEXT;
