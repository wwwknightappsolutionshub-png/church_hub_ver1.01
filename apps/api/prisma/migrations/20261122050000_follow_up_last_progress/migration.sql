-- Journey check-in clock: 12–24h “Due today” after assign / stage advance
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "lastProgressAt" TIMESTAMP(3);

UPDATE "follow_ups"
SET "lastProgressAt" = COALESCE("lastProgressAt", "assignedAt", "updatedAt", "createdAt")
WHERE "archivedAt" IS NULL
  AND "assignedToId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "follow_ups_churchId_lastProgressAt_idx"
  ON "follow_ups"("churchId", "lastProgressAt");
