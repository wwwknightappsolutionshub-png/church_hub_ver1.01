-- Choir team extended features

CREATE TYPE "ChoirVoicePart" AS ENUM ('SOPRANO', 'TENOR', 'ALTO', 'BASS');
CREATE TYPE "ChoirRosterEventType" AS ENUM ('SUNDAY_MINISTRY', 'MIDWEEK_REHEARSAL');
CREATE TYPE "ChoirAttendanceEventType" AS ENUM ('REHEARSAL', 'SUNDAY_MINISTRY');
CREATE TYPE "ChoirAuditionStatus" AS ENUM ('SCHEDULED', 'PASSED', 'DEFERRED', 'DECLINED');

ALTER TABLE "dept_choir_songs" ADD COLUMN IF NOT EXISTS "tempoBpm" INTEGER;
ALTER TABLE "dept_choir_songs" ADD COLUMN IF NOT EXISTS "lyrics" TEXT;
ALTER TABLE "dept_choir_songs" ADD COLUMN IF NOT EXISTS "audioSampleUrl" TEXT;
ALTER TABLE "dept_choir_songs" ADD COLUMN IF NOT EXISTS "sheetUrl" TEXT;
ALTER TABLE "dept_choir_songs" ADD COLUMN IF NOT EXISTS "chordChart" TEXT;
ALTER TABLE "dept_choir_songs" ADD COLUMN IF NOT EXISTS "practiceTrackUrl" TEXT;

CREATE TABLE "dept_choir_roster_entries" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "eventType" "ChoirRosterEventType" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "voicePart" "ChoirVoicePart" NOT NULL,
  "memberId" TEXT NOT NULL,
  "notes" TEXT,
  "reminderSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_choir_roster_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dept_choir_roster_entries_serviceUnitId_startsAt_idx" ON "dept_choir_roster_entries"("serviceUnitId", "startsAt");
ALTER TABLE "dept_choir_roster_entries" ADD CONSTRAINT "dept_choir_roster_entries_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_roster_entries" ADD CONSTRAINT "dept_choir_roster_entries_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_roster_entries" ADD CONSTRAINT "dept_choir_roster_entries_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dept_choir_setlists" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_choir_setlists_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dept_choir_setlists_serviceUnitId_serviceDate_idx" ON "dept_choir_setlists"("serviceUnitId", "serviceDate");
ALTER TABLE "dept_choir_setlists" ADD CONSTRAINT "dept_choir_setlists_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_setlists" ADD CONSTRAINT "dept_choir_setlists_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dept_choir_setlist_items" (
  "id" TEXT NOT NULL,
  "setlistId" TEXT NOT NULL,
  "songId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "musicalKey" TEXT,
  "tempoBpm" INTEGER,
  "notes" TEXT,
  CONSTRAINT "dept_choir_setlist_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dept_choir_setlist_items_setlistId_songId_key" ON "dept_choir_setlist_items"("setlistId", "songId");
ALTER TABLE "dept_choir_setlist_items" ADD CONSTRAINT "dept_choir_setlist_items_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "dept_choir_setlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_setlist_items" ADD CONSTRAINT "dept_choir_setlist_items_songId_fkey" FOREIGN KEY ("songId") REFERENCES "dept_choir_songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dept_choir_song_feedback" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "songId" TEXT NOT NULL,
  "setlistId" TEXT,
  "memberId" TEXT NOT NULL,
  "rating" INTEGER,
  "difficultyScore" INTEGER,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_choir_song_feedback_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "dept_choir_song_feedback" ADD CONSTRAINT "dept_choir_song_feedback_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_song_feedback" ADD CONSTRAINT "dept_choir_song_feedback_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_song_feedback" ADD CONSTRAINT "dept_choir_song_feedback_songId_fkey" FOREIGN KEY ("songId") REFERENCES "dept_choir_songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_song_feedback" ADD CONSTRAINT "dept_choir_song_feedback_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "dept_choir_setlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dept_choir_song_feedback" ADD CONSTRAINT "dept_choir_song_feedback_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dept_choir_attendance" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "eventType" "ChoirAttendanceEventType" NOT NULL,
  "eventDate" TIMESTAMP(3) NOT NULL,
  "memberId" TEXT NOT NULL,
  "attended" BOOLEAN NOT NULL DEFAULT true,
  "arrivedAt" TIMESTAMP(3),
  "minutesLate" INTEGER NOT NULL DEFAULT 0,
  "followUpSentAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_choir_attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dept_choir_attendance_serviceUnitId_eventType_eventDate_memberId_key" ON "dept_choir_attendance"("serviceUnitId", "eventType", "eventDate", "memberId");
ALTER TABLE "dept_choir_attendance" ADD CONSTRAINT "dept_choir_attendance_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_attendance" ADD CONSTRAINT "dept_choir_attendance_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_attendance" ADD CONSTRAINT "dept_choir_attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dept_choir_auditions" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "status" "ChoirAuditionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "voicePart" "ChoirVoicePart",
  "auditionDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_choir_auditions_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "dept_choir_auditions" ADD CONSTRAINT "dept_choir_auditions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_auditions" ADD CONSTRAINT "dept_choir_auditions_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_auditions" ADD CONSTRAINT "dept_choir_auditions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dept_choir_voice_tasks" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_choir_voice_tasks_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "dept_choir_voice_tasks" ADD CONSTRAINT "dept_choir_voice_tasks_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_voice_tasks" ADD CONSTRAINT "dept_choir_voice_tasks_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_voice_tasks" ADD CONSTRAINT "dept_choir_voice_tasks_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dept_choir_vocal_notes" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "improvementTag" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_choir_vocal_notes_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "dept_choir_vocal_notes" ADD CONSTRAINT "dept_choir_vocal_notes_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_vocal_notes" ADD CONSTRAINT "dept_choir_vocal_notes_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_vocal_notes" ADD CONSTRAINT "dept_choir_vocal_notes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_vocal_notes" ADD CONSTRAINT "dept_choir_vocal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
