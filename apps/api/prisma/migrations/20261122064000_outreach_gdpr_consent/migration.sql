-- GDPR consent captured with each outreach lead
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "gdprConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "gdprConsentAt" TIMESTAMP(3);
