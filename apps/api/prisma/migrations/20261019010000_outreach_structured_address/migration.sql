-- Structured international address on outreach contacts (non-UK phone captures).
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "addressStreet" TEXT;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "addressCity" TEXT;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "addressState" TEXT;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "addressCountry" TEXT;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "addressPostal" TEXT;
