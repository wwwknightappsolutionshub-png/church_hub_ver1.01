-- Phase 10: Individual challenges, progress, badges & milestones

ALTER TYPE "DevotionalChallengeScope" ADD VALUE 'INDIVIDUAL';

ALTER TABLE "devotional_challenge_members"
  ADD COLUMN IF NOT EXISTS "progressCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "devotional_challenge_milestones" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "devotional_challenge_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "devotional_challenge_badges_earned" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devotional_challenge_badges_earned_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devotional_challenge_milestones_challengeId_badgeKey_key"
  ON "devotional_challenge_milestones"("challengeId", "badgeKey");
CREATE INDEX IF NOT EXISTS "devotional_challenge_milestones_challengeId_threshold_idx"
  ON "devotional_challenge_milestones"("challengeId", "threshold");

CREATE UNIQUE INDEX IF NOT EXISTS "devotional_challenge_badges_earned_challengeId_memberId_milestoneId_key"
  ON "devotional_challenge_badges_earned"("challengeId", "memberId", "milestoneId");
CREATE INDEX IF NOT EXISTS "devotional_challenge_badges_earned_memberId_earnedAt_idx"
  ON "devotional_challenge_badges_earned"("memberId", "earnedAt");

CREATE INDEX IF NOT EXISTS "devotional_challenges_createdById_scope_idx"
  ON "devotional_challenges"("createdById", "scope");
CREATE INDEX IF NOT EXISTS "devotional_challenge_members_memberId_progressCount_idx"
  ON "devotional_challenge_members"("memberId", "progressCount");

ALTER TABLE "devotional_challenge_milestones"
  ADD CONSTRAINT "devotional_challenge_milestones_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "devotional_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "devotional_challenge_badges_earned"
  ADD CONSTRAINT "devotional_challenge_badges_earned_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "devotional_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_challenge_badges_earned"
  ADD CONSTRAINT "devotional_challenge_badges_earned_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_challenge_badges_earned"
  ADD CONSTRAINT "devotional_challenge_badges_earned_milestoneId_fkey"
  FOREIGN KEY ("milestoneId") REFERENCES "devotional_challenge_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "devotional_challenge_members" m
SET "progressCount" = sub.cnt
FROM (
  SELECT ap."challengeId", ap."memberId", COUNT(*)::int AS cnt
  FROM "devotional_action_points" ap
  WHERE ap."challengeId" IS NOT NULL AND ap."status" = 'COMPLETED'
  GROUP BY ap."challengeId", ap."memberId"
) sub
WHERE m."challengeId" = sub."challengeId" AND m."memberId" = sub."memberId";
