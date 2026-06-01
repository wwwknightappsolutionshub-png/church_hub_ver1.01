-- Phase 6: Devotional journals (private + team)

ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "contentFormat" TEXT NOT NULL DEFAULT 'html';
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "moods" JSONB NOT NULL DEFAULT '[]';
UPDATE "devotional_journal_entries" SET "moods" = jsonb_build_array("mood") WHERE "mood" IS NOT NULL AND trim("mood") <> '';
ALTER TABLE "devotional_journal_entries" DROP COLUMN IF EXISTS "mood";
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "scriptureRefs" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "voiceNoteUrl" TEXT;
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "voiceTranscript" TEXT;
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "recapPromptId" TEXT;
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "pinnedById" TEXT;
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "shareExpiresAt" TIMESTAMP(3);
ALTER TABLE "devotional_journal_entries" ADD COLUMN IF NOT EXISTS "lastEditedById" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "devotional_journal_entries_shareToken_key" ON "devotional_journal_entries"("shareToken");
CREATE INDEX IF NOT EXISTS "devotional_journal_entries_groupId_visibility_isPinned_idx" ON "devotional_journal_entries"("groupId", "visibility", "isPinned");
CREATE INDEX IF NOT EXISTS "devotional_journal_entries_churchId_shareToken_idx" ON "devotional_journal_entries"("churchId", "shareToken");

ALTER TABLE "devotional_journal_entries" ADD CONSTRAINT "devotional_journal_entries_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devotional_journal_entries" ADD CONSTRAINT "devotional_journal_entries_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "devotional_journal_comments" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devotional_journal_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "devotional_journal_reactions" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devotional_journal_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "devotional_journal_reactions_entryId_memberId_emoji_key" ON "devotional_journal_reactions"("entryId", "memberId", "emoji");
CREATE INDEX IF NOT EXISTS "devotional_journal_reactions_entryId_idx" ON "devotional_journal_reactions"("entryId");
CREATE INDEX IF NOT EXISTS "devotional_journal_comments_entryId_createdAt_idx" ON "devotional_journal_comments"("entryId", "createdAt");
CREATE INDEX IF NOT EXISTS "devotional_journal_comments_parentId_idx" ON "devotional_journal_comments"("parentId");

ALTER TABLE "devotional_journal_comments" ADD CONSTRAINT "devotional_journal_comments_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "devotional_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_journal_comments" ADD CONSTRAINT "devotional_journal_comments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_journal_comments" ADD CONSTRAINT "devotional_journal_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "devotional_journal_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "devotional_journal_reactions" ADD CONSTRAINT "devotional_journal_reactions_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "devotional_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_journal_reactions" ADD CONSTRAINT "devotional_journal_reactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
