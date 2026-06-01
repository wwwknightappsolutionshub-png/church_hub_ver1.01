-- Phase 8: Action points, weekly review data, challenges

CREATE TYPE "DevotionalActionPointStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');
CREATE TYPE "DevotionalChallengeScope" AS ENUM ('CHURCH', 'GROUP');

CREATE TABLE "devotional_challenges" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "groupId" TEXT,
    "scope" "DevotionalChallengeScope" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "targetCount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devotional_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_challenge_members" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devotional_challenge_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devotional_action_points" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT,
    "dayId" TEXT,
    "groupId" TEXT,
    "challengeId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "weekKey" TEXT,
    "status" "DevotionalActionPointStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderFrequency" "DevotionalReminderFrequency",
    "reminderChannels" JSONB NOT NULL DEFAULT '[]',
    "reminderHourLocal" INTEGER NOT NULL DEFAULT 9,
    "reminderMinuteLocal" INTEGER NOT NULL DEFAULT 0,
    "reminderTimezone" TEXT NOT NULL DEFAULT 'UTC',
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devotional_action_points_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devotional_challenge_members_challengeId_memberId_key" ON "devotional_challenge_members"("challengeId", "memberId");
CREATE INDEX "devotional_challenges_churchId_scope_isActive_idx" ON "devotional_challenges"("churchId", "scope", "isActive");
CREATE INDEX "devotional_challenges_groupId_isActive_idx" ON "devotional_challenges"("groupId", "isActive");
CREATE INDEX "devotional_action_points_memberId_weekKey_status_idx" ON "devotional_action_points"("memberId", "weekKey", "status");
CREATE INDEX "devotional_action_points_churchId_challengeId_idx" ON "devotional_action_points"("churchId", "challengeId");
CREATE INDEX "devotional_action_points_memberId_remindersEnabled_idx" ON "devotional_action_points"("memberId", "remindersEnabled");

ALTER TABLE "devotional_challenges" ADD CONSTRAINT "devotional_challenges_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_challenges" ADD CONSTRAINT "devotional_challenges_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "devotional_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_challenges" ADD CONSTRAINT "devotional_challenges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "devotional_challenge_members" ADD CONSTRAINT "devotional_challenge_members_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "devotional_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_challenge_members" ADD CONSTRAINT "devotional_challenge_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "devotional_action_points" ADD CONSTRAINT "devotional_action_points_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_action_points" ADD CONSTRAINT "devotional_action_points_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_action_points" ADD CONSTRAINT "devotional_action_points_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_action_points" ADD CONSTRAINT "devotional_action_points_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "devotional_plan_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_action_points" ADD CONSTRAINT "devotional_action_points_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "devotional_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_action_points" ADD CONSTRAINT "devotional_action_points_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "devotional_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
