-- Joined Group day-6 leader notification tracking

ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "joinedGroupDay6NotifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "follow_ups_churchId_stage_completedAt_idx"
  ON "follow_ups"("churchId", "stage", "completedAt");
