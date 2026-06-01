-- Prayer Squad extended tools

CREATE TYPE "PrayerBurdenType" AS ENUM ('WEEKLY_BURDEN', 'CHURCH_WIDE', 'MEMBER_NEED');
CREATE TYPE "PrayerConfidentiality" AS ENUM ('PUBLIC', 'LEADERS_ONLY', 'PASTORS_ONLY', 'INTERCESSORS_ONLY');
CREATE TYPE "PrayerIntakeCategory" AS ENUM ('URGENT', 'HEALING', 'FAMILY', 'FINANCIAL', 'SALVATION', 'THANKSGIVING', 'OTHER');
CREATE TYPE "PrayerScheduleType" AS ENUM ('MIDNIGHT_CHAIN', 'DAILY_WATCH', 'WEEKLY_MEETING');

ALTER TABLE "dept_prayer_items" ADD COLUMN IF NOT EXISTS "intakeCategory" "PrayerIntakeCategory";
ALTER TABLE "dept_prayer_items" ADD COLUMN IF NOT EXISTS "confidentiality" "PrayerConfidentiality" NOT NULL DEFAULT 'LEADERS_ONLY';
ALTER TABLE "dept_prayer_items" ADD COLUMN IF NOT EXISTS "submittedByMemberId" TEXT;
ALTER TABLE "dept_prayer_items" ADD COLUMN IF NOT EXISTS "relatedMemberId" TEXT;
ALTER TABLE "dept_prayer_items" ADD COLUMN IF NOT EXISTS "escalatedToPastorAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "dept_prayer_assignments" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "burdenType" "PrayerBurdenType" NOT NULL,
    "confidentiality" "PrayerConfidentiality" NOT NULL DEFAULT 'LEADERS_ONLY',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "relatedMemberId" TEXT,
    "assignedMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dept_prayer_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dept_prayer_schedule_sessions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "eventType" "PrayerScheduleType" NOT NULL,
    "title" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dept_prayer_schedule_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dept_prayer_schedule_attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dept_prayer_schedule_attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dept_prayer_progress_notes" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "prayerItemId" TEXT,
    "assignmentId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "statusAfter" "DeptPrayerItemStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dept_prayer_progress_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dept_prayer_scripture_guides" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "scriptureRef" TEXT NOT NULL,
    "prayerPoints" TEXT NOT NULL,
    "devotionTieIn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dept_prayer_scripture_guides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dept_prayer_schedule_attendance_sessionId_memberId_key" ON "dept_prayer_schedule_attendance"("sessionId", "memberId");
CREATE UNIQUE INDEX IF NOT EXISTS "dept_prayer_scripture_guides_serviceUnitId_serviceDate_key" ON "dept_prayer_scripture_guides"("serviceUnitId", "serviceDate");
CREATE INDEX IF NOT EXISTS "dept_prayer_assignments_serviceUnitId_weekStart_idx" ON "dept_prayer_assignments"("serviceUnitId", "weekStart");
CREATE INDEX IF NOT EXISTS "dept_prayer_schedule_sessions_serviceUnitId_startsAt_idx" ON "dept_prayer_schedule_sessions"("serviceUnitId", "startsAt");
CREATE INDEX IF NOT EXISTS "dept_prayer_progress_notes_prayerItemId_idx" ON "dept_prayer_progress_notes"("prayerItemId");

ALTER TABLE "dept_prayer_assignments" ADD CONSTRAINT "dept_prayer_assignments_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_assignments" ADD CONSTRAINT "dept_prayer_assignments_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_assignments" ADD CONSTRAINT "dept_prayer_assignments_relatedMemberId_fkey" FOREIGN KEY ("relatedMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_assignments" ADD CONSTRAINT "dept_prayer_assignments_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dept_prayer_schedule_sessions" ADD CONSTRAINT "dept_prayer_schedule_sessions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_schedule_sessions" ADD CONSTRAINT "dept_prayer_schedule_sessions_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_prayer_schedule_attendance" ADD CONSTRAINT "dept_prayer_schedule_attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "dept_prayer_schedule_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_schedule_attendance" ADD CONSTRAINT "dept_prayer_schedule_attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_prayer_progress_notes" ADD CONSTRAINT "dept_prayer_progress_notes_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_progress_notes" ADD CONSTRAINT "dept_prayer_progress_notes_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_progress_notes" ADD CONSTRAINT "dept_prayer_progress_notes_prayerItemId_fkey" FOREIGN KEY ("prayerItemId") REFERENCES "dept_prayer_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_progress_notes" ADD CONSTRAINT "dept_prayer_progress_notes_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "dept_prayer_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_progress_notes" ADD CONSTRAINT "dept_prayer_progress_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_prayer_scripture_guides" ADD CONSTRAINT "dept_prayer_scripture_guides_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_scripture_guides" ADD CONSTRAINT "dept_prayer_scripture_guides_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_prayer_items" ADD CONSTRAINT "dept_prayer_items_submittedByMemberId_fkey" FOREIGN KEY ("submittedByMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_items" ADD CONSTRAINT "dept_prayer_items_relatedMemberId_fkey" FOREIGN KEY ("relatedMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
