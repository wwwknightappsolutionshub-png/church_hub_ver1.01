-- Follow-up soft archive, DND request, next-action, and note stage/kind metadata.

ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "nextAction" TEXT;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "archivedById" TEXT;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "archiveReason" TEXT;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "archiveRequestedAt" TIMESTAMP(3);
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "archiveRequestedById" TEXT;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "archiveRequestReason" TEXT;

ALTER TABLE "pastoral_notes" ADD COLUMN IF NOT EXISTS "stageAtTime" "FollowUpStage";
ALTER TABLE "pastoral_notes" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'NOTE';

CREATE INDEX IF NOT EXISTS "follow_ups_churchId_archivedAt_idx" ON "follow_ups"("churchId", "archivedAt");

DO $$ BEGIN
  ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_archivedById_fkey"
    FOREIGN KEY ("archivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_archiveRequestedById_fkey"
    FOREIGN KEY ("archiveRequestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
