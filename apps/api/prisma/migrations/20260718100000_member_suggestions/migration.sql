-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SuggestionTopic" AS ENUM ('CHURCH_SERVICE', 'EVANGELISM', 'MEMBERSHIP', 'GRIEVANCE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "member_suggestions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "topic" "SuggestionTopic" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "member_suggestions_churchId_createdAt_idx" ON "member_suggestions"("churchId", "createdAt");
CREATE INDEX IF NOT EXISTS "member_suggestions_churchId_topic_idx" ON "member_suggestions"("churchId", "topic");

DO $$ BEGIN
  ALTER TABLE "member_suggestions"
    ADD CONSTRAINT "member_suggestions_churchId_fkey"
    FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "member_suggestions"
    ADD CONSTRAINT "member_suggestions_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
