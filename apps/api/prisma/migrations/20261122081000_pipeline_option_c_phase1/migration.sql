-- Option C Phase 1: pipeline templates + church definitions (resolve read-only)

CREATE TABLE IF NOT EXISTS "pipeline_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pipeline_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_templates_key_key" ON "pipeline_templates"("key");

CREATE TABLE IF NOT EXISTS "pipeline_template_stages" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "phaseKey" TEXT NOT NULL,
    "phaseStep" INTEGER NOT NULL,
    "phaseTitle" TEXT NOT NULL,
    "colorToken" TEXT,
    "isEntry" BOOLEAN NOT NULL DEFAULT false,
    "blocksArchive" BOOLEAN NOT NULL DEFAULT false,
    "graduatesSla" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "pipeline_template_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_template_stages_templateId_key_key"
  ON "pipeline_template_stages"("templateId", "key");
CREATE INDEX IF NOT EXISTS "pipeline_template_stages_templateId_sortOrder_idx"
  ON "pipeline_template_stages"("templateId", "sortOrder");

ALTER TABLE "pipeline_template_stages"
  DROP CONSTRAINT IF EXISTS "pipeline_template_stages_templateId_fkey";
ALTER TABLE "pipeline_template_stages"
  ADD CONSTRAINT "pipeline_template_stages_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "pipeline_templates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "pipeline_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "forkedFromVersion" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pipeline_definitions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pipeline_definitions_churchId_isActive_idx"
  ON "pipeline_definitions"("churchId", "isActive");

ALTER TABLE "pipeline_definitions"
  DROP CONSTRAINT IF EXISTS "pipeline_definitions_churchId_fkey";
ALTER TABLE "pipeline_definitions"
  ADD CONSTRAINT "pipeline_definitions_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pipeline_definitions"
  DROP CONSTRAINT IF EXISTS "pipeline_definitions_templateId_fkey";
ALTER TABLE "pipeline_definitions"
  ADD CONSTRAINT "pipeline_definitions_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "pipeline_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "pipeline_stages" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "phaseKey" TEXT NOT NULL,
    "phaseStep" INTEGER NOT NULL,
    "phaseTitle" TEXT NOT NULL,
    "colorToken" TEXT,
    "isEntry" BOOLEAN NOT NULL DEFAULT false,
    "blocksArchive" BOOLEAN NOT NULL DEFAULT false,
    "graduatesSla" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_stages_definitionId_key_key"
  ON "pipeline_stages"("definitionId", "key");
CREATE INDEX IF NOT EXISTS "pipeline_stages_definitionId_sortOrder_idx"
  ON "pipeline_stages"("definitionId", "sortOrder");

ALTER TABLE "pipeline_stages"
  DROP CONSTRAINT IF EXISTS "pipeline_stages_definitionId_fkey";
ALTER TABLE "pipeline_stages"
  ADD CONSTRAINT "pipeline_stages_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "pipeline_definitions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
