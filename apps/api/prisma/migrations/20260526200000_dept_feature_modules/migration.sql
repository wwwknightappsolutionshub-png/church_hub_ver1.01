-- Department feature modules: Medical, Media, Children, Choir, Prayer Squad

ALTER TYPE "DepartmentCode" ADD VALUE IF NOT EXISTS 'MEDICAL';

CREATE TYPE "DeptScheduleType" AS ENUM (
  'VOLUNTEER_SHIFT',
  'SERVICE_DUTY',
  'REHEARSAL',
  'VIGIL',
  'TRAINING',
  'TEACHING',
  'MEDIA_PRODUCTION',
  'EMERGENCY_STANDBY'
);

CREATE TYPE "DeptAssignmentStatus" AS ENUM ('OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DeptTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE "DeptPrayerItemStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ANSWERED');

CREATE TYPE "DeptReportCategory" AS ENUM (
  'WEEKLY_COVERAGE',
  'INCIDENT_SUMMARY',
  'VOLUNTEER_AVAILABILITY',
  'SERVICE_COVERAGE',
  'EQUIPMENT_STATUS',
  'PRODUCTION_BACKLOG',
  'WEEKLY_ATTENDANCE',
  'TEACHER_PERFORMANCE',
  'CHILD_ENGAGEMENT',
  'REHEARSAL_PARTICIPATION',
  'SERVICE_PERFORMANCE',
  'VOCAL_ATTENDANCE',
  'PRAYER_REQUEST_STATUS',
  'INTERCESSOR_ACTIVITY',
  'PRAYER_MEETING_ATTENDANCE',
  'GENERAL'
);

CREATE TABLE "dept_schedules" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "type" "DeptScheduleType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "assignedMemberId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_assignments" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "role" TEXT,
  "memberId" TEXT,
  "dueAt" TIMESTAMP(3),
  "status" "DeptAssignmentStatus" NOT NULL DEFAULT 'OPEN',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_module_reports" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "category" "DeptReportCategory" NOT NULL DEFAULT 'GENERAL',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "stats" JSONB NOT NULL DEFAULT '{}',
  "authorId" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_module_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_inventory_items" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "minQuantity" INTEGER,
  "expiryDate" TIMESTAMP(3),
  "location" TEXT,
  "category" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_resources" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT,
  "body" TEXT,
  "tags" JSONB NOT NULL DEFAULT '[]',
  "authorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_tasks" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "DeptTaskStatus" NOT NULL DEFAULT 'TODO',
  "column" TEXT NOT NULL DEFAULT 'backlog',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "assigneeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_incidents" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'LOW',
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_child_check_ins" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "childMemberId" TEXT NOT NULL,
  "guardianMemberId" TEXT,
  "classGroup" TEXT,
  "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkedOutAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_child_check_ins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_prayer_items" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "requesterName" TEXT,
  "content" TEXT NOT NULL,
  "status" "DeptPrayerItemStatus" NOT NULL DEFAULT 'NEW',
  "assignedMemberId" TEXT,
  "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  "isAnswered" BOOLEAN NOT NULL DEFAULT false,
  "answeredAt" TIMESTAMP(3),
  "answeredNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_prayer_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_skills" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "skill" TEXT NOT NULL,
  "level" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_choir_songs" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "musicalKey" TEXT,
  "vocalParts" JSONB NOT NULL DEFAULT '{}',
  "recordingUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_choir_songs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_certifications" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_certifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_progress_notes" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "childMemberId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "behaviorTag" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_progress_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_prayer_checklists" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "checklistDate" TIMESTAMP(3) NOT NULL,
  "itemKey" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "memberId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dept_prayer_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dept_follow_up_logs" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "followedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT NOT NULL,
  CONSTRAINT "dept_follow_up_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dept_skills_serviceUnitId_memberId_skill_key" ON "dept_skills"("serviceUnitId", "memberId", "skill");
CREATE UNIQUE INDEX "dept_prayer_checklists_serviceUnitId_checklistDate_itemKey_key" ON "dept_prayer_checklists"("serviceUnitId", "checklistDate", "itemKey");

CREATE INDEX "dept_schedules_serviceUnitId_startsAt_idx" ON "dept_schedules"("serviceUnitId", "startsAt");
CREATE INDEX "dept_assignments_serviceUnitId_status_idx" ON "dept_assignments"("serviceUnitId", "status");
CREATE INDEX "dept_module_reports_serviceUnitId_submittedAt_idx" ON "dept_module_reports"("serviceUnitId", "submittedAt");
CREATE INDEX "dept_inventory_items_serviceUnitId_idx" ON "dept_inventory_items"("serviceUnitId");
CREATE INDEX "dept_resources_serviceUnitId_category_idx" ON "dept_resources"("serviceUnitId", "category");
CREATE INDEX "dept_tasks_serviceUnitId_column_sortOrder_idx" ON "dept_tasks"("serviceUnitId", "column", "sortOrder");
CREATE INDEX "dept_incidents_serviceUnitId_occurredAt_idx" ON "dept_incidents"("serviceUnitId", "occurredAt");
CREATE INDEX "dept_child_check_ins_serviceUnitId_checkedInAt_idx" ON "dept_child_check_ins"("serviceUnitId", "checkedInAt");
CREATE INDEX "dept_prayer_items_serviceUnitId_status_idx" ON "dept_prayer_items"("serviceUnitId", "status");
CREATE INDEX "dept_choir_songs_serviceUnitId_idx" ON "dept_choir_songs"("serviceUnitId");
CREATE INDEX "dept_certifications_serviceUnitId_memberId_idx" ON "dept_certifications"("serviceUnitId", "memberId");
CREATE INDEX "dept_progress_notes_serviceUnitId_childMemberId_idx" ON "dept_progress_notes"("serviceUnitId", "childMemberId");
CREATE INDEX "dept_follow_up_logs_serviceUnitId_followedAt_idx" ON "dept_follow_up_logs"("serviceUnitId", "followedAt");

ALTER TABLE "dept_schedules" ADD CONSTRAINT "dept_schedules_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_schedules" ADD CONSTRAINT "dept_schedules_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_schedules" ADD CONSTRAINT "dept_schedules_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dept_assignments" ADD CONSTRAINT "dept_assignments_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_assignments" ADD CONSTRAINT "dept_assignments_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_assignments" ADD CONSTRAINT "dept_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dept_module_reports" ADD CONSTRAINT "dept_module_reports_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_module_reports" ADD CONSTRAINT "dept_module_reports_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_module_reports" ADD CONSTRAINT "dept_module_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_inventory_items" ADD CONSTRAINT "dept_inventory_items_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_inventory_items" ADD CONSTRAINT "dept_inventory_items_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_resources" ADD CONSTRAINT "dept_resources_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_resources" ADD CONSTRAINT "dept_resources_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_resources" ADD CONSTRAINT "dept_resources_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dept_tasks" ADD CONSTRAINT "dept_tasks_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_tasks" ADD CONSTRAINT "dept_tasks_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_tasks" ADD CONSTRAINT "dept_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dept_incidents" ADD CONSTRAINT "dept_incidents_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_incidents" ADD CONSTRAINT "dept_incidents_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_incidents" ADD CONSTRAINT "dept_incidents_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_child_check_ins" ADD CONSTRAINT "dept_child_check_ins_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_child_check_ins" ADD CONSTRAINT "dept_child_check_ins_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_child_check_ins" ADD CONSTRAINT "dept_child_check_ins_childMemberId_fkey" FOREIGN KEY ("childMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_child_check_ins" ADD CONSTRAINT "dept_child_check_ins_guardianMemberId_fkey" FOREIGN KEY ("guardianMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dept_prayer_items" ADD CONSTRAINT "dept_prayer_items_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_items" ADD CONSTRAINT "dept_prayer_items_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_items" ADD CONSTRAINT "dept_prayer_items_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dept_skills" ADD CONSTRAINT "dept_skills_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_skills" ADD CONSTRAINT "dept_skills_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_skills" ADD CONSTRAINT "dept_skills_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_choir_songs" ADD CONSTRAINT "dept_choir_songs_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_choir_songs" ADD CONSTRAINT "dept_choir_songs_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_certifications" ADD CONSTRAINT "dept_certifications_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_certifications" ADD CONSTRAINT "dept_certifications_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_certifications" ADD CONSTRAINT "dept_certifications_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_progress_notes" ADD CONSTRAINT "dept_progress_notes_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_progress_notes" ADD CONSTRAINT "dept_progress_notes_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_progress_notes" ADD CONSTRAINT "dept_progress_notes_childMemberId_fkey" FOREIGN KEY ("childMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_progress_notes" ADD CONSTRAINT "dept_progress_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_prayer_checklists" ADD CONSTRAINT "dept_prayer_checklists_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_checklists" ADD CONSTRAINT "dept_prayer_checklists_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_prayer_checklists" ADD CONSTRAINT "dept_prayer_checklists_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dept_follow_up_logs" ADD CONSTRAINT "dept_follow_up_logs_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_follow_up_logs" ADD CONSTRAINT "dept_follow_up_logs_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_follow_up_logs" ADD CONSTRAINT "dept_follow_up_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_follow_up_logs" ADD CONSTRAINT "dept_follow_up_logs_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
