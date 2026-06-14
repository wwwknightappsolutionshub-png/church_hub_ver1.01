-- CreateEnum
CREATE TYPE "ChurchCalendarEventKind" AS ENUM ('EVENT', 'BIRTHDAY', 'ANNIVERSARY');

-- CreateEnum
CREATE TYPE "AutomationEmailTemplateCode" AS ENUM ('STAFF_WELCOME', 'ABSENTEE_FOLLOWUP', 'NEW_MEMBER_WELCOME', 'WEEKLY_DIGEST', 'EVENT_REMINDER', 'CUSTOM');

-- CreateTable
CREATE TABLE "church_calendar_events" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "kind" "ChurchCalendarEventKind" NOT NULL DEFAULT 'EVENT',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "highlightColor" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "church_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_email_templates" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "code" "AutomationEmailTemplateCode" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "church_calendar_events_churchId_startsAt_idx" ON "church_calendar_events"("churchId", "startsAt");

-- CreateIndex
CREATE INDEX "automation_email_templates_churchId_sortOrder_idx" ON "automation_email_templates"("churchId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "automation_email_templates_churchId_code_key" ON "automation_email_templates"("churchId", "code");

-- AddForeignKey
ALTER TABLE "church_calendar_events" ADD CONSTRAINT "church_calendar_events_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_calendar_events" ADD CONSTRAINT "church_calendar_events_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_email_templates" ADD CONSTRAINT "automation_email_templates_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
