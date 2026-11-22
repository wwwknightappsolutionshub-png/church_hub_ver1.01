-- Establishment: link contacts to a Winners Satellite Fellowship (WSF) cell branch
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "wsfCellBranchId" TEXT;

CREATE INDEX IF NOT EXISTS "follow_ups_churchId_wsfCellBranchId_idx"
  ON "follow_ups"("churchId", "wsfCellBranchId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follow_ups_wsfCellBranchId_fkey'
  ) THEN
    ALTER TABLE "follow_ups"
      ADD CONSTRAINT "follow_ups_wsfCellBranchId_fkey"
      FOREIGN KEY ("wsfCellBranchId") REFERENCES "cell_branches"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
