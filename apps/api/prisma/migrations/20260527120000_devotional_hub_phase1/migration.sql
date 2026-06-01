-- Devotional Hub Phase 1 — core architecture

CREATE TYPE "DevotionalAudience" AS ENUM ('ALL', 'YOUTH', 'ADULT', 'FAMILY', 'LEADERS');
CREATE TYPE "DevotionalReminderChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'ALARM');
CREATE TYPE "DevotionalAiArtifactType" AS ENUM ('STUDY_OUTLINE', 'PRAYER_POINTS', 'SCRIPTURE_ASK', 'SIMPLIFIED_YOUTH', 'SIMPLIFIED_CHILD', 'DISCUSSION_SUMMARY');
CREATE TYPE "DevotionalPdfImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "DevotionalMeetupStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "DevotionalDiscussionStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');
CREATE TYPE "DevotionalJournalVisibility" AS ENUM ('PRIVATE', 'GROUP');
CREATE TYPE "DevotionalPrayerListScope" AS ENUM ('PERSONAL', 'GROUP', 'PLAN_DAY');

ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "audience" "DevotionalAudience" NOT NULL DEFAULT 'ALL';
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

CREATE TABLE "devotional_plan_days" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scriptureRef" TEXT,
    "scriptureText" TEXT,
    "reflection" TEXT,
    "prayerPrompt" TEXT,
    "actionPoint" TEXT,
    "simplifiedYouth" TEXT,
    "simplifiedChild" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_plan_days_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_groups" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "planId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devotional_group_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_journal_entries" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT,
    "dayId" TEXT,
    "groupId" TEXT,
    "visibility" "DevotionalJournalVisibility" NOT NULL DEFAULT 'PRIVATE',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "mood" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_prayer_lists" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT,
    "groupId" TEXT,
    "planId" TEXT,
    "scope" "DevotionalPrayerListScope" NOT NULL DEFAULT 'PERSONAL',
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_prayer_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_prayer_list_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "dayId" TEXT,
    "body" TEXT NOT NULL,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devotional_prayer_list_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_study_progress" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayId" TEXT,
    "lastDay" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_study_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_reminders" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT,
    "channel" "DevotionalReminderChannel" NOT NULL,
    "hourLocal" INTEGER NOT NULL DEFAULT 7,
    "minuteLocal" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_reminders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_pdf_imports" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "planId" TEXT,
    "uploadedById" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "DevotionalPdfImportStatus" NOT NULL DEFAULT 'PENDING',
    "pageCount" INTEGER,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_pdf_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_ai_artifacts" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "planId" TEXT,
    "dayId" TEXT,
    "pdfImportId" TEXT,
    "type" "DevotionalAiArtifactType" NOT NULL,
    "prompt" TEXT,
    "content" JSONB NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devotional_ai_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_meetups" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "groupId" TEXT,
    "planId" TEXT,
    "hostId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "DevotionalMeetupStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_meetups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_meetup_attendees" (
    "id" TEXT NOT NULL,
    "meetupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devotional_meetup_attendees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_discussions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "groupId" TEXT,
    "planId" TEXT,
    "dayId" TEXT,
    "memberId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" "DevotionalDiscussionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_discussions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_discussion_transcripts" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "audioUrl" TEXT,
    "transcriptText" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devotional_discussion_transcripts_pkey" PRIMARY KEY ("id")
);

-- Indexes & uniques
CREATE UNIQUE INDEX "devotional_plan_days_planId_dayNumber_key" ON "devotional_plan_days"("planId", "dayNumber");
CREATE INDEX "devotional_plan_days_planId_sortOrder_idx" ON "devotional_plan_days"("planId", "sortOrder");
CREATE INDEX "devotional_plans_churchId_isActive_startDate_idx" ON "devotional_plans"("churchId", "isActive", "startDate");
CREATE INDEX "devotional_groups_churchId_isActive_idx" ON "devotional_groups"("churchId", "isActive");
CREATE UNIQUE INDEX "devotional_group_members_groupId_memberId_key" ON "devotional_group_members"("groupId", "memberId");
CREATE INDEX "devotional_journal_entries_memberId_createdAt_idx" ON "devotional_journal_entries"("memberId", "createdAt");
CREATE INDEX "devotional_journal_entries_groupId_visibility_idx" ON "devotional_journal_entries"("groupId", "visibility");
CREATE UNIQUE INDEX "devotional_study_progress_memberId_planId_key" ON "devotional_study_progress"("memberId", "planId");
CREATE INDEX "devotional_study_progress_churchId_planId_idx" ON "devotional_study_progress"("churchId", "planId");
CREATE INDEX "devotional_reminders_memberId_isEnabled_idx" ON "devotional_reminders"("memberId", "isEnabled");
CREATE INDEX "devotional_pdf_imports_churchId_status_idx" ON "devotional_pdf_imports"("churchId", "status");
CREATE INDEX "devotional_ai_artifacts_planId_type_idx" ON "devotional_ai_artifacts"("planId", "type");
CREATE INDEX "devotional_meetups_churchId_startsAt_idx" ON "devotional_meetups"("churchId", "startsAt");
CREATE UNIQUE INDEX "devotional_meetup_attendees_meetupId_memberId_key" ON "devotional_meetup_attendees"("meetupId", "memberId");
CREATE INDEX "devotional_discussions_groupId_createdAt_idx" ON "devotional_discussions"("groupId", "createdAt");

-- Foreign keys
ALTER TABLE "devotional_plans" ADD CONSTRAINT "devotional_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_plan_days" ADD CONSTRAINT "devotional_plan_days_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_groups" ADD CONSTRAINT "devotional_groups_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_groups" ADD CONSTRAINT "devotional_groups_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_groups" ADD CONSTRAINT "devotional_groups_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_group_members" ADD CONSTRAINT "devotional_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "devotional_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_group_members" ADD CONSTRAINT "devotional_group_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_journal_entries" ADD CONSTRAINT "devotional_journal_entries_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_journal_entries" ADD CONSTRAINT "devotional_journal_entries_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_journal_entries" ADD CONSTRAINT "devotional_journal_entries_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_journal_entries" ADD CONSTRAINT "devotional_journal_entries_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "devotional_plan_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_journal_entries" ADD CONSTRAINT "devotional_journal_entries_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "devotional_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_prayer_lists" ADD CONSTRAINT "devotional_prayer_lists_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_prayer_lists" ADD CONSTRAINT "devotional_prayer_lists_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_prayer_lists" ADD CONSTRAINT "devotional_prayer_lists_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "devotional_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_prayer_lists" ADD CONSTRAINT "devotional_prayer_lists_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_prayer_list_items" ADD CONSTRAINT "devotional_prayer_list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "devotional_prayer_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_prayer_list_items" ADD CONSTRAINT "devotional_prayer_list_items_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "devotional_plan_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_study_progress" ADD CONSTRAINT "devotional_study_progress_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_study_progress" ADD CONSTRAINT "devotional_study_progress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_study_progress" ADD CONSTRAINT "devotional_study_progress_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_study_progress" ADD CONSTRAINT "devotional_study_progress_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "devotional_plan_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_reminders" ADD CONSTRAINT "devotional_reminders_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_reminders" ADD CONSTRAINT "devotional_reminders_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_pdf_imports" ADD CONSTRAINT "devotional_pdf_imports_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_pdf_imports" ADD CONSTRAINT "devotional_pdf_imports_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_pdf_imports" ADD CONSTRAINT "devotional_pdf_imports_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_ai_artifacts" ADD CONSTRAINT "devotional_ai_artifacts_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_ai_artifacts" ADD CONSTRAINT "devotional_ai_artifacts_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "devotional_plan_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_ai_artifacts" ADD CONSTRAINT "devotional_ai_artifacts_pdfImportId_fkey" FOREIGN KEY ("pdfImportId") REFERENCES "devotional_pdf_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_meetups" ADD CONSTRAINT "devotional_meetups_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_meetups" ADD CONSTRAINT "devotional_meetups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "devotional_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_meetups" ADD CONSTRAINT "devotional_meetups_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_meetups" ADD CONSTRAINT "devotional_meetups_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_meetup_attendees" ADD CONSTRAINT "devotional_meetup_attendees_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "devotional_meetups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_meetup_attendees" ADD CONSTRAINT "devotional_meetup_attendees_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_discussions" ADD CONSTRAINT "devotional_discussions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_discussions" ADD CONSTRAINT "devotional_discussions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "devotional_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_discussions" ADD CONSTRAINT "devotional_discussions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_discussions" ADD CONSTRAINT "devotional_discussions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_discussion_transcripts" ADD CONSTRAINT "devotional_discussion_transcripts_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "devotional_discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
