-- Membership CSV import jobs
CREATE TYPE "MembershipImportJobStatus" AS ENUM ('UPLOADED', 'PREVIEWED', 'COMMITTED', 'FAILED');
CREATE TYPE "MembershipImportRowAction" AS ENUM ('CREATE', 'UPDATE', 'SKIP', 'ERROR');
CREATE TYPE "MembershipImportMode" AS ENUM ('MEMBERS', 'LEADS');

ALTER TYPE "MemberActivityType" ADD VALUE IF NOT EXISTS 'MEMBER_IMPORTED';

CREATE TABLE "membership_import_jobs" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "status" "MembershipImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "mode" "MembershipImportMode" NOT NULL DEFAULT 'MEMBERS',
    "sourceFilename" TEXT,
    "columnMapping" JSONB NOT NULL DEFAULT '{}',
    "options" JSONB NOT NULL DEFAULT '{}',
    "rowCounts" JSONB NOT NULL DEFAULT '{}',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "membership_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_import_job_rows" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "mapped" JSONB NOT NULL DEFAULT '{}',
    "action" "MembershipImportRowAction",
    "error" TEXT,
    "memberId" TEXT,
    "familyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_import_job_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_import_job_rows_jobId_rowIndex_key" ON "membership_import_job_rows"("jobId", "rowIndex");
CREATE INDEX "membership_import_job_rows_jobId_action_idx" ON "membership_import_job_rows"("jobId", "action");
CREATE INDEX "membership_import_jobs_churchId_status_createdAt_idx" ON "membership_import_jobs"("churchId", "status", "createdAt");

ALTER TABLE "membership_import_jobs" ADD CONSTRAINT "membership_import_jobs_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_import_jobs" ADD CONSTRAINT "membership_import_jobs_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_import_job_rows" ADD CONSTRAINT "membership_import_job_rows_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "membership_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_import_job_rows" ADD CONSTRAINT "membership_import_job_rows_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
