-- Ministry/Cells module

CREATE TYPE "CellFormKind" AS ENUM ('WEEKLY_REPORT', 'INCIDENT', 'CUSTOM');
CREATE TYPE "CellIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "CellIncidentStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'CLOSED');
CREATE TYPE "CellPrayerStatus" AS ENUM ('OPEN', 'PRAYING', 'ANSWERED', 'CLOSED');

CREATE TABLE "cell_branches" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "leaderUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cell_branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_branch_members" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cell_branch_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_form_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "kind" "CellFormKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cell_form_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_reports" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cell_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_meetings" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cell_meetings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_attendance" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "meetingId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "presentCount" INTEGER NOT NULL,
    "absentCount" INTEGER,
    "notes" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cell_attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_incidents" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "CellIncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "CellIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "reportedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cell_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_teaching_resources" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "content" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cell_teaching_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_messages" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cell_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_prayer_requests" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "memberId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "CellPrayerStatus" NOT NULL DEFAULT 'OPEN',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cell_prayer_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_reminders" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "branchId" TEXT,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cell_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cell_branch_members_memberId_key" ON "cell_branch_members"("memberId");
CREATE UNIQUE INDEX "cell_branch_members_churchId_memberId_key" ON "cell_branch_members"("churchId", "memberId");
CREATE INDEX "cell_branch_members_branchId_idx" ON "cell_branch_members"("branchId");
CREATE INDEX "cell_branches_churchId_name_idx" ON "cell_branches"("churchId", "name");
CREATE INDEX "cell_branches_churchId_leaderUserId_idx" ON "cell_branches"("churchId", "leaderUserId");
CREATE INDEX "cell_form_definitions_churchId_kind_isActive_idx" ON "cell_form_definitions"("churchId", "kind", "isActive");
CREATE INDEX "cell_reports_churchId_branchId_submittedAt_idx" ON "cell_reports"("churchId", "branchId", "submittedAt");
CREATE INDEX "cell_meetings_churchId_branchId_meetingDate_idx" ON "cell_meetings"("churchId", "branchId", "meetingDate");
CREATE INDEX "cell_attendance_churchId_branchId_weekStart_idx" ON "cell_attendance"("churchId", "branchId", "weekStart");
CREATE INDEX "cell_incidents_churchId_branchId_status_idx" ON "cell_incidents"("churchId", "branchId", "status");
CREATE INDEX "cell_teaching_resources_churchId_sortOrder_idx" ON "cell_teaching_resources"("churchId", "sortOrder");
CREATE INDEX "cell_messages_churchId_branchId_createdAt_idx" ON "cell_messages"("churchId", "branchId", "createdAt");
CREATE INDEX "cell_messages_toUserId_readAt_idx" ON "cell_messages"("toUserId", "readAt");
CREATE INDEX "cell_prayer_requests_churchId_branchId_status_idx" ON "cell_prayer_requests"("churchId", "branchId", "status");
CREATE INDEX "cell_reminders_churchId_remindAt_sentAt_idx" ON "cell_reminders"("churchId", "remindAt", "sentAt");

ALTER TABLE "cell_branches" ADD CONSTRAINT "cell_branches_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_branches" ADD CONSTRAINT "cell_branches_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cell_branch_members" ADD CONSTRAINT "cell_branch_members_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_branch_members" ADD CONSTRAINT "cell_branch_members_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "cell_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_branch_members" ADD CONSTRAINT "cell_branch_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_form_definitions" ADD CONSTRAINT "cell_form_definitions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_reports" ADD CONSTRAINT "cell_reports_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_reports" ADD CONSTRAINT "cell_reports_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "cell_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_reports" ADD CONSTRAINT "cell_reports_formId_fkey" FOREIGN KEY ("formId") REFERENCES "cell_form_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_reports" ADD CONSTRAINT "cell_reports_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_meetings" ADD CONSTRAINT "cell_meetings_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_meetings" ADD CONSTRAINT "cell_meetings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "cell_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_attendance" ADD CONSTRAINT "cell_attendance_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_attendance" ADD CONSTRAINT "cell_attendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "cell_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_attendance" ADD CONSTRAINT "cell_attendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "cell_meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cell_attendance" ADD CONSTRAINT "cell_attendance_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_incidents" ADD CONSTRAINT "cell_incidents_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_incidents" ADD CONSTRAINT "cell_incidents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "cell_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_incidents" ADD CONSTRAINT "cell_incidents_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_teaching_resources" ADD CONSTRAINT "cell_teaching_resources_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_messages" ADD CONSTRAINT "cell_messages_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_messages" ADD CONSTRAINT "cell_messages_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "cell_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_messages" ADD CONSTRAINT "cell_messages_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_messages" ADD CONSTRAINT "cell_messages_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_prayer_requests" ADD CONSTRAINT "cell_prayer_requests_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_prayer_requests" ADD CONSTRAINT "cell_prayer_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "cell_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_prayer_requests" ADD CONSTRAINT "cell_prayer_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cell_prayer_requests" ADD CONSTRAINT "cell_prayer_requests_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_reminders" ADD CONSTRAINT "cell_reminders_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_reminders" ADD CONSTRAINT "cell_reminders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "cell_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
