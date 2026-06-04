-- CreateTable
CREATE TABLE "follow_up_templates" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "follow_up_templates_churchId_channel_idx" ON "follow_up_templates"("churchId", "channel");

ALTER TABLE "follow_up_templates" ADD CONSTRAINT "follow_up_templates_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "FollowUpAutomationTrigger" AS ENUM ('NEW_LEAD', 'STAGE_ENTER', 'OVERDUE');

-- CreateEnum
CREATE TYPE "CounselingCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CounselingCategory" AS ENUM ('COUNSELING', 'PRAYER', 'CRISIS', 'MARRIAGE', 'GRIEF', 'OTHER');

-- CreateEnum
CREATE TYPE "CarePrayerStatus" AS ENUM ('OPEN', 'PRAYING', 'ANSWERED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "follow_up_automation_rules" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "FollowUpAutomationTrigger" NOT NULL,
    "stage" "FollowUpStage",
    "delayHours" INTEGER NOT NULL DEFAULT 24,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "message" TEXT,
    "templateId" TEXT,
    "notifyAssignee" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_automation_runs" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counseling_cases" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT,
    "followUpId" TEXT,
    "title" TEXT NOT NULL,
    "category" "CounselingCategory" NOT NULL DEFAULT 'COUNSELING',
    "status" "CounselingCaseStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "isConfidential" BOOLEAN NOT NULL DEFAULT true,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counseling_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counseling_sessions" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "counseling_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_prayer_requests" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT,
    "followUpId" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" "CarePrayerStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isConfidential" BOOLEAN NOT NULL DEFAULT true,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_prayer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follow_up_automation_rules_churchId_trigger_isActive_idx" ON "follow_up_automation_rules"("churchId", "trigger", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_automation_runs_ruleId_followUpId_key" ON "follow_up_automation_runs"("ruleId", "followUpId");

-- CreateIndex
CREATE INDEX "counseling_cases_churchId_status_idx" ON "counseling_cases"("churchId", "status");

-- CreateIndex
CREATE INDEX "counseling_cases_assignedToId_idx" ON "counseling_cases"("assignedToId");

-- CreateIndex
CREATE INDEX "counseling_sessions_caseId_scheduledAt_idx" ON "counseling_sessions"("caseId", "scheduledAt");

-- CreateIndex
CREATE INDEX "care_prayer_requests_churchId_status_idx" ON "care_prayer_requests"("churchId", "status");

-- AddForeignKey
ALTER TABLE "follow_up_automation_rules" ADD CONSTRAINT "follow_up_automation_rules_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_automation_runs" ADD CONSTRAINT "follow_up_automation_runs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "follow_up_automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_automation_runs" ADD CONSTRAINT "follow_up_automation_runs_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "follow_ups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counseling_cases" ADD CONSTRAINT "counseling_cases_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counseling_cases" ADD CONSTRAINT "counseling_cases_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counseling_cases" ADD CONSTRAINT "counseling_cases_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "follow_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counseling_cases" ADD CONSTRAINT "counseling_cases_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "counseling_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_prayer_requests" ADD CONSTRAINT "care_prayer_requests_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_prayer_requests" ADD CONSTRAINT "care_prayer_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_prayer_requests" ADD CONSTRAINT "care_prayer_requests_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "follow_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_prayer_requests" ADD CONSTRAINT "care_prayer_requests_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
