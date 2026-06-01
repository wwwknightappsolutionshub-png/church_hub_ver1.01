-- Devotional Hub Phase 2 — user-created plans, drafts, versioning

CREATE TYPE "DevotionalPlanStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "DevotionalPlanSourceType" AS ENUM ('TOPICAL_BOOK', 'BIBLE_BOOK', 'CUSTOM_TOPIC', 'PDF_IMPORT');
CREATE TYPE "DevotionalPlanTone" AS ENUM ('YOUTH', 'ADULT', 'FAMILY', 'NEW_BELIEVER');

ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "status" "DevotionalPlanStatus" NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "sourceType" "DevotionalPlanSourceType";
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "sourceLabel" TEXT;
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "topicalBook" TEXT;
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "bibleBook" TEXT;
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "customTopic" TEXT;
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "tone" "DevotionalPlanTone";
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER;
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "durationWeeks" INTEGER;
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "outlineVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "devotional_plans" ADD COLUMN IF NOT EXISTS "pdfImportId" TEXT;

CREATE TABLE "devotional_plan_outline_versions" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "tone" "DevotionalPlanTone",
    "sourceLabel" TEXT,
    "daysSnapshot" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devotional_plan_outline_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devotional_plan_outline_versions_planId_version_key" ON "devotional_plan_outline_versions"("planId", "version");
CREATE INDEX "devotional_plan_outline_versions_planId_createdAt_idx" ON "devotional_plan_outline_versions"("planId", "createdAt");

ALTER TABLE "devotional_plan_outline_versions" ADD CONSTRAINT "devotional_plan_outline_versions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "devotional_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "devotional_plans_pdfImportId_key" ON "devotional_plans"("pdfImportId");
ALTER TABLE "devotional_plans" ADD CONSTRAINT "devotional_plans_pdfImportId_fkey" FOREIGN KEY ("pdfImportId") REFERENCES "devotional_pdf_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "devotional_plans_churchId_status_createdById_idx" ON "devotional_plans"("churchId", "status", "createdById");
