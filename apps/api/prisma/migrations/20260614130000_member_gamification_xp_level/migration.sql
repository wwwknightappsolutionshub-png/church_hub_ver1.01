-- member_gamification xp/level (in schema + seed; missing from init)

ALTER TABLE "member_gamification" ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "member_gamification" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1;
