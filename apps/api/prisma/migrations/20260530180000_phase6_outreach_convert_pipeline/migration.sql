-- Phase 6 — Outreach convert pipeline, bus pickup, follow-up/member linkage

CREATE TYPE "OutreachConvertStage" AS ENUM (
  'CAPTURED',
  'CONTACTED',
  'VISITED',
  'READY_FOR_MEMBERSHIP',
  'CONVERTED',
  'ARCHIVED'
);

ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "voiceNotes" TEXT;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "convertStage" "OutreachConvertStage" NOT NULL DEFAULT 'CAPTURED';
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "needsBusPickup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "busPickupNotes" TEXT;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "followUpId" TEXT;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "memberId" TEXT;
ALTER TABLE "outreach_contacts" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "outreach_contacts_followUpId_key" ON "outreach_contacts"("followUpId");
CREATE INDEX IF NOT EXISTS "outreach_contacts_churchId_convertStage_idx" ON "outreach_contacts"("churchId", "convertStage");

DO $$ BEGIN
  ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_followUpId_fkey"
    FOREIGN KEY ("followUpId") REFERENCES "follow_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
