-- Public marketing contact & feedback submissions
CREATE TYPE "MarketingInboundType" AS ENUM ('CONTACT', 'FEEDBACK');
CREATE TYPE "MarketingInboundStatus" AS ENUM ('NEW', 'READ', 'ARCHIVED');

CREATE TABLE IF NOT EXISTS "platform_marketing_submissions" (
    "id" TEXT NOT NULL,
    "type" "MarketingInboundType" NOT NULL,
    "status" "MarketingInboundStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "internalNotes" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_marketing_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_marketing_submissions_status_createdAt_idx"
    ON "platform_marketing_submissions"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "platform_marketing_submissions_type_createdAt_idx"
    ON "platform_marketing_submissions"("type", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'platform_marketing_submissions_handledById_fkey'
    ) THEN
        ALTER TABLE "platform_marketing_submissions"
            ADD CONSTRAINT "platform_marketing_submissions_handledById_fkey"
            FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
