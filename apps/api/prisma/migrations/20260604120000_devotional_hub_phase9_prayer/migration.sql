-- Phase 9: Prayer lists — streaks, boosters, digest support

ALTER TABLE "devotional_prayer_list_items" ADD COLUMN IF NOT EXISTS "answeredAt" TIMESTAMP(3);
ALTER TABLE "devotional_prayer_list_items" ADD COLUMN IF NOT EXISTS "aiBooster" JSONB;
ALTER TABLE "devotional_prayer_list_items" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "devotional_prayer_list_items_listId_isAnswered_idx" ON "devotional_prayer_list_items"("listId", "isAnswered");

CREATE TABLE IF NOT EXISTS "devotional_prayer_streaks" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPrayedOn" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devotional_prayer_streaks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "devotional_prayer_daily_logs" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "prayedOn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devotional_prayer_daily_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devotional_prayer_streaks_memberId_key" ON "devotional_prayer_streaks"("memberId");
CREATE UNIQUE INDEX IF NOT EXISTS "devotional_prayer_daily_logs_memberId_prayedOn_key" ON "devotional_prayer_daily_logs"("memberId", "prayedOn");
CREATE INDEX IF NOT EXISTS "devotional_prayer_daily_logs_memberId_prayedOn_idx" ON "devotional_prayer_daily_logs"("memberId", "prayedOn");

ALTER TABLE "devotional_prayer_streaks" ADD CONSTRAINT "devotional_prayer_streaks_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_prayer_streaks" ADD CONSTRAINT "devotional_prayer_streaks_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "devotional_prayer_daily_logs" ADD CONSTRAINT "devotional_prayer_daily_logs_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_prayer_daily_logs" ADD CONSTRAINT "devotional_prayer_daily_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
