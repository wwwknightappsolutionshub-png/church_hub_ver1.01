-- Celebration email templates + queue kinds for birthday/anniversary automations
CREATE TYPE "CelebrationEmailTemplateKind" AS ENUM ('BIRTHDAY', 'ANNIVERSARY');

CREATE TABLE IF NOT EXISTS "celebration_email_templates" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "kind" "CelebrationEmailTemplateKind" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoSend" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "celebration_email_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "celebration_email_templates_churchId_kind_key"
  ON "celebration_email_templates"("churchId", "kind");

DO $$ BEGIN
  ALTER TABLE "celebration_email_templates"
    ADD CONSTRAINT "celebration_email_templates_churchId_fkey"
    FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "CommunicationQueueKind" ADD VALUE IF NOT EXISTS 'BIRTHDAY_GREETING';
ALTER TYPE "CommunicationQueueKind" ADD VALUE IF NOT EXISTS 'ANNIVERSARY_GREETING';
