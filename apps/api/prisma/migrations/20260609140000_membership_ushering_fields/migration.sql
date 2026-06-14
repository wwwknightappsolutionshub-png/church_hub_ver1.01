-- Family & member occasion fields + ushering weekly headcounts
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "homeCell" TEXT;
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "specialOccasion" TEXT;
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "specialOccasionDate" TIMESTAMP(3);

ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "specialOccasion" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "specialOccasionDate" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ushering_weekly_headcounts" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "male" INTEGER NOT NULL DEFAULT 0,
    "female" INTEGER NOT NULL DEFAULT 0,
    "babies" INTEGER NOT NULL DEFAULT 0,
    "children" INTEGER NOT NULL DEFAULT 0,
    "totalAttendees" INTEGER NOT NULL DEFAULT 0,
    "recordedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ushering_weekly_headcounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ushering_weekly_headcounts_serviceUnitId_weekStart_key"
  ON "ushering_weekly_headcounts"("serviceUnitId", "weekStart");
CREATE INDEX IF NOT EXISTS "ushering_weekly_headcounts_churchId_weekStart_idx"
  ON "ushering_weekly_headcounts"("churchId", "weekStart");

DO $$ BEGIN
  ALTER TABLE "ushering_weekly_headcounts"
    ADD CONSTRAINT "ushering_weekly_headcounts_churchId_fkey"
    FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ushering_weekly_headcounts"
    ADD CONSTRAINT "ushering_weekly_headcounts_serviceUnitId_fkey"
    FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
