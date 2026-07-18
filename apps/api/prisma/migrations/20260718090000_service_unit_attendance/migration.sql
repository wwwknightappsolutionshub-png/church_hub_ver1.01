-- CreateTable
CREATE TABLE IF NOT EXISTS "service_unit_attendance" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "meetingDate" TIMESTAMP(3),
    "presentCount" INTEGER NOT NULL,
    "absentCount" INTEGER,
    "maleCount" INTEGER NOT NULL DEFAULT 0,
    "femaleCount" INTEGER NOT NULL DEFAULT 0,
    "boysCount" INTEGER NOT NULL DEFAULT 0,
    "girlsCount" INTEGER NOT NULL DEFAULT 0,
    "testifiersCount" INTEGER NOT NULL DEFAULT 0,
    "firstTimersCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_unit_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "service_unit_attendance_churchId_serviceUnitId_weekStart_idx"
  ON "service_unit_attendance"("churchId", "serviceUnitId", "weekStart");

CREATE INDEX IF NOT EXISTS "service_unit_attendance_churchId_meetingDate_idx"
  ON "service_unit_attendance"("churchId", "meetingDate");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "service_unit_attendance"
    ADD CONSTRAINT "service_unit_attendance_churchId_fkey"
    FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_unit_attendance"
    ADD CONSTRAINT "service_unit_attendance_serviceUnitId_fkey"
    FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_unit_attendance"
    ADD CONSTRAINT "service_unit_attendance_recordedByUserId_fkey"
    FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
