-- Phase 9 — Membership automation layer (workflows, triggers, sync engine, audit logs)

CREATE TYPE "AutomationWorkflowKind" AS ENUM (
  'WEEKLY_WORKFLOW',
  'ABSENTEE_TRIGGER',
  'FIRST_TIMER_TRIGGER',
  'NEW_CONVERT_TRIGGER',
  'FOLLOW_UP_REMINDER',
  'PASTORAL_ALERT',
  'SYNC_ENGINE',
  'RECOMMENDATION'
);

CREATE TYPE "AutomationRunStatus" AS ENUM (
  'SUCCESS',
  'PARTIAL',
  'FAILED',
  'SKIPPED'
);

CREATE TABLE "church_automation_settings" (
  "churchId" TEXT NOT NULL,
  "weeklyWorkflowsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "absenteeTriggersEnabled" BOOLEAN NOT NULL DEFAULT true,
  "firstTimerTriggersEnabled" BOOLEAN NOT NULL DEFAULT true,
  "newConvertTriggersEnabled" BOOLEAN NOT NULL DEFAULT true,
  "followUpRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pastoralAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "syncEngineEnabled" BOOLEAN NOT NULL DEFAULT true,
  "recommendationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastWeeklyRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "church_automation_settings_pkey" PRIMARY KEY ("churchId")
);

CREATE TABLE "automation_run_logs" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "workflow" "AutomationWorkflowKind" NOT NULL,
  "status" "AutomationRunStatus" NOT NULL,
  "summary" TEXT NOT NULL,
  "stats" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),

  CONSTRAINT "automation_run_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "automation_run_logs_churchId_workflow_startedAt_idx"
  ON "automation_run_logs"("churchId", "workflow", "startedAt");

ALTER TABLE "church_automation_settings" ADD CONSTRAINT "church_automation_settings_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_run_logs" ADD CONSTRAINT "automation_run_logs_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "CommunicationQueueKind" ADD VALUE IF NOT EXISTS 'FIRST_TIMER_WELCOME';
ALTER TYPE "CommunicationQueueKind" ADD VALUE IF NOT EXISTS 'NEW_CONVERT_WELCOME';
ALTER TYPE "CommunicationQueueKind" ADD VALUE IF NOT EXISTS 'PASTORAL_ALERT';
ALTER TYPE "CommunicationQueueKind" ADD VALUE IF NOT EXISTS 'AUTOMATION_RECOMMENDATION';
