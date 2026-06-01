-- Phase 7: Group meetups, RSVP, reminders, post-event

CREATE TYPE "DevotionalMeetupRsvpStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
CREATE TYPE "DevotionalMeetupRecurrence" AS ENUM ('NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "onlineLink" TEXT;
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "locationType" TEXT;
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "recurrence" "DevotionalMeetupRecurrence" NOT NULL DEFAULT 'NONE';
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "recurrenceSeriesId" TEXT;
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "duplicatedFromId" TEXT;
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "reminderOffsetsMinutes" JSONB NOT NULL DEFAULT '[1440,60,10]';
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "postEventSummary" TEXT;
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "postEventPrayerPoints" TEXT;
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "postEventActionSteps" TEXT;
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "postEventProgressNote" TEXT;
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "postEventCompletedAt" TIMESTAMP(3);
ALTER TABLE "devotional_meetups" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

CREATE INDEX IF NOT EXISTS "devotional_meetups_groupId_status_startsAt_idx" ON "devotional_meetups"("groupId", "status", "startsAt");
CREATE INDEX IF NOT EXISTS "devotional_meetups_recurrenceSeriesId_idx" ON "devotional_meetups"("recurrenceSeriesId");

ALTER TABLE "devotional_meetups" ADD CONSTRAINT "devotional_meetups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "devotional_meetup_attendees" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "devotional_meetup_attendees"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "DevotionalMeetupRsvpStatus" USING (
    CASE "status"
      WHEN 'GOING' THEN 'ACCEPTED'::"DevotionalMeetupRsvpStatus"
      WHEN 'ACCEPTED' THEN 'ACCEPTED'::"DevotionalMeetupRsvpStatus"
      WHEN 'DECLINED' THEN 'DECLINED'::"DevotionalMeetupRsvpStatus"
      ELSE 'PENDING'::"DevotionalMeetupRsvpStatus"
    END
  );
ALTER TABLE "devotional_meetup_attendees" ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS "devotional_meetup_reminders" (
    "id" TEXT NOT NULL,
    "meetupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "channel" "DevotionalReminderChannel" NOT NULL,
    "fireAt" TIMESTAMP(3) NOT NULL,
    "status" "DevotionalReminderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "notificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devotional_meetup_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devotional_meetup_reminders_meetupId_memberId_offsetMinutes_channel_key" ON "devotional_meetup_reminders"("meetupId", "memberId", "offsetMinutes", "channel");
CREATE INDEX IF NOT EXISTS "devotional_meetup_reminders_fireAt_status_idx" ON "devotional_meetup_reminders"("fireAt", "status");

ALTER TABLE "devotional_meetup_reminders" ADD CONSTRAINT "devotional_meetup_reminders_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "devotional_meetups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_meetup_reminders" ADD CONSTRAINT "devotional_meetup_reminders_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
