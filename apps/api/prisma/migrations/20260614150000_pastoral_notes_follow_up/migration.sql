-- pastoral_notes.followUpId (schema + seed; missing from init)

ALTER TABLE "pastoral_notes" ALTER COLUMN "memberId" DROP NOT NULL;

ALTER TABLE "pastoral_notes" ADD COLUMN IF NOT EXISTS "followUpId" TEXT;

CREATE INDEX IF NOT EXISTS "pastoral_notes_followUpId_idx" ON "pastoral_notes"("followUpId");

ALTER TABLE "pastoral_notes" ADD CONSTRAINT "pastoral_notes_followUpId_fkey"
  FOREIGN KEY ("followUpId") REFERENCES "follow_ups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
