-- Devotional Hub Phase 3 — reminder system

CREATE TYPE "DevotionalReminderFrequency" AS ENUM ('HOURLY', 'DAILY');
CREATE TYPE "DevotionalReminderDeliveryStatus" AS ENUM ('PENDING', 'SNOOZED', 'DELIVERED', 'DONE', 'DISMISSED');

CREATE TABLE "devotional_reminder_preferences" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "quietStartHour" INTEGER NOT NULL DEFAULT 22,
    "quietEndHour" INTEGER NOT NULL DEFAULT 7,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_reminder_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devotional_reminder_preferences_memberId_key" ON "devotional_reminder_preferences"("memberId");

ALTER TABLE "devotional_reminder_preferences" ADD CONSTRAINT "devotional_reminder_preferences_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_reminder_preferences" ADD CONSTRAINT "devotional_reminder_preferences_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "devotional_reminders" ADD COLUMN IF NOT EXISTS "frequency" "DevotionalReminderFrequency" NOT NULL DEFAULT 'DAILY';
ALTER TABLE "devotional_reminders" ADD COLUMN IF NOT EXISTS "snoozedUntil" TIMESTAMP(3);

ALTER TABLE "devotional_reminders" DROP CONSTRAINT IF EXISTS "devotional_reminders_planId_fkey";
ALTER TABLE "devotional_reminders" ADD CONSTRAINT "devotional_reminders_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "devotional_reminders_memberId_planId_channel_key" ON "devotional_reminders"("memberId", "planId", "channel");
CREATE INDEX IF NOT EXISTS "devotional_reminders_isEnabled_snoozedUntil_idx" ON "devotional_reminders"("isEnabled", "snoozedUntil");

CREATE TABLE "devotional_reminder_deliveries" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "planId" TEXT,
    "planTitle" TEXT,
    "dayNumber" INTEGER,
    "channel" "DevotionalReminderChannel" NOT NULL,
    "frequency" "DevotionalReminderFrequency" NOT NULL,
    "status" "DevotionalReminderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "snoozedUntil" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notificationId" TEXT,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_reminder_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "devotional_reminder_deliveries_memberId_status_snoozedUntil_idx" ON "devotional_reminder_deliveries"("memberId", "status", "snoozedUntil");
CREATE INDEX "devotional_reminder_deliveries_userId_status_firedAt_idx" ON "devotional_reminder_deliveries"("userId", "status", "firedAt");

ALTER TABLE "devotional_reminder_deliveries" ADD CONSTRAINT "devotional_reminder_deliveries_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_reminder_deliveries" ADD CONSTRAINT "devotional_reminder_deliveries_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_reminder_deliveries" ADD CONSTRAINT "devotional_reminder_deliveries_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "devotional_reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
