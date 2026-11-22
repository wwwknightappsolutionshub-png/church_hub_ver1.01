-- Establishment Phase 4: immutable stage-change audit log
CREATE TABLE IF NOT EXISTS "follow_up_stage_audits" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStage" "FollowUpStage" NOT NULL,
    "toStage" "FollowUpStage" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_stage_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "follow_up_stage_audits_churchId_followUpId_createdAt_idx"
  ON "follow_up_stage_audits"("churchId", "followUpId", "createdAt");

CREATE INDEX IF NOT EXISTS "follow_up_stage_audits_followUpId_createdAt_idx"
  ON "follow_up_stage_audits"("followUpId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follow_up_stage_audits_churchId_fkey'
  ) THEN
    ALTER TABLE "follow_up_stage_audits"
      ADD CONSTRAINT "follow_up_stage_audits_churchId_fkey"
      FOREIGN KEY ("churchId") REFERENCES "churches"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follow_up_stage_audits_followUpId_fkey'
  ) THEN
    ALTER TABLE "follow_up_stage_audits"
      ADD CONSTRAINT "follow_up_stage_audits_followUpId_fkey"
      FOREIGN KEY ("followUpId") REFERENCES "follow_ups"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follow_up_stage_audits_actorId_fkey'
  ) THEN
    ALTER TABLE "follow_up_stage_audits"
      ADD CONSTRAINT "follow_up_stage_audits_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
