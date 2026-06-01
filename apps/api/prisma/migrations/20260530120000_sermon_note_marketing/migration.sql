-- CreateEnum
CREATE TYPE "SermonNoteSourceType" AS ENUM ('AUDIO', 'TEXT', 'PDF');

-- CreateEnum
CREATE TYPE "SermonNoteStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PlatformEmailTemplateCategory" AS ENUM ('WELCOME', 'ONBOARDING', 'FEATURES', 'REENGAGEMENT');

-- CreateTable
CREATE TABLE "sermon_notes" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "speakerName" TEXT,
    "sundayDate" TIMESTAMP(3),
    "sourceType" "SermonNoteSourceType" NOT NULL,
    "sourceUrl" TEXT,
    "sourceText" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "status" "SermonNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "devotionalPlanId" TEXT,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sermon_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_email_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PlatformEmailTemplateCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sermon_notes_devotionalPlanId_key" ON "sermon_notes"("devotionalPlanId");

-- CreateIndex
CREATE INDEX "sermon_notes_churchId_status_createdAt_idx" ON "sermon_notes"("churchId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_email_templates_slug_key" ON "platform_email_templates"("slug");

-- CreateIndex
CREATE INDEX "platform_email_templates_category_idx" ON "platform_email_templates"("category");

-- AddForeignKey
ALTER TABLE "sermon_notes" ADD CONSTRAINT "sermon_notes_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sermon_notes" ADD CONSTRAINT "sermon_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sermon_notes" ADD CONSTRAINT "sermon_notes_devotionalPlanId_fkey" FOREIGN KEY ("devotionalPlanId") REFERENCES "devotional_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
