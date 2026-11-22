-- Assignment SLA: 72h to change stage after assign; one-shot overdue alerts
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "stageAtAssignment" "FollowUpStage";
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "assignmentStaleNotifiedAt" TIMESTAMP(3);

-- Backfill clock for currently assigned, active pipeline contacts
UPDATE "follow_ups"
SET
  "assignedAt" = COALESCE("assignedAt", "updatedAt", "createdAt"),
  "stageAtAssignment" = COALESCE("stageAtAssignment", "stage")
WHERE "assignedToId" IS NOT NULL
  AND "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "follow_ups_assignedAt_assignmentStaleNotifiedAt_idx"
  ON "follow_ups"("assignedAt", "assignmentStaleNotifiedAt");
