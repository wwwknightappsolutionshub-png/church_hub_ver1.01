-- Platform marketing upsell drip queue + UPSELL template category

ALTER TYPE "PlatformEmailTemplateCategory" ADD VALUE IF NOT EXISTS 'UPSELL';

CREATE TABLE IF NOT EXISTS "platform_marketing_drips" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dripStep" INTEGER NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "skipReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_marketing_drips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_marketing_drips_userId_dripStep_key"
  ON "platform_marketing_drips"("userId", "dripStep");

CREATE INDEX IF NOT EXISTS "platform_marketing_drips_scheduledAt_sentAt_skippedAt_idx"
  ON "platform_marketing_drips"("scheduledAt", "sentAt", "skippedAt");

ALTER TABLE "platform_marketing_drips"
  ADD CONSTRAINT "platform_marketing_drips_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_marketing_drips"
  ADD CONSTRAINT "platform_marketing_drips_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
