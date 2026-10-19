-- CreateEnum
CREATE TYPE "OutreachImportJobStatus" AS ENUM ('UPLOADED', 'PREVIEWED', 'COMMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutreachImportRowAction" AS ENUM ('CREATE', 'SKIP', 'ERROR');

-- CreateTable
CREATE TABLE "outreach_import_jobs" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "status" "OutreachImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "sourceFilename" TEXT,
    "columnMapping" JSONB NOT NULL DEFAULT '{}',
    "options" JSONB NOT NULL DEFAULT '{}',
    "rowCounts" JSONB NOT NULL DEFAULT '{}',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "outreach_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_import_job_rows" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "mapped" JSONB NOT NULL DEFAULT '{}',
    "action" "OutreachImportRowAction",
    "error" TEXT,
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_import_job_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outreach_import_jobs_churchId_status_createdAt_idx" ON "outreach_import_jobs"("churchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "outreach_import_job_rows_jobId_action_idx" ON "outreach_import_job_rows"("jobId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "outreach_import_job_rows_jobId_rowIndex_key" ON "outreach_import_job_rows"("jobId", "rowIndex");

-- AddForeignKey
ALTER TABLE "outreach_import_jobs" ADD CONSTRAINT "outreach_import_jobs_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_import_jobs" ADD CONSTRAINT "outreach_import_jobs_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_import_job_rows" ADD CONSTRAINT "outreach_import_job_rows_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "outreach_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_import_job_rows" ADD CONSTRAINT "outreach_import_job_rows_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "outreach_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
