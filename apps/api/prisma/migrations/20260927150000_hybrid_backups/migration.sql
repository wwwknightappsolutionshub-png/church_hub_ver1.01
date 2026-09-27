-- Hybrid backups: full DB + per-tenant export, requests, schedules

CREATE TYPE "BackupScope" AS ENUM ('FULL_DB', 'TENANT');
CREATE TYPE "BackupJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'CANCELLED');
CREATE TYPE "BackupTrigger" AS ENUM ('SCHEDULED', 'MANUAL_ADMIN', 'TENANT_REQUEST');
CREATE TYPE "BackupArtifactType" AS ENUM ('SQL_GZ', 'TENANT_JSON_GZ', 'MEDIA_ZIP', 'MANIFEST_JSON');
CREATE TYPE "BackupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "BackupFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL,
    "churchId" TEXT,
    "scope" "BackupScope" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" "BackupFrequency" NOT NULL DEFAULT 'DAILY',
    "hourUtc" INTEGER NOT NULL DEFAULT 2,
    "minuteUtc" INTEGER NOT NULL DEFAULT 0,
    "dayOfPeriod" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backup_requests" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT,
    "status" "BackupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backup_jobs" (
    "id" TEXT NOT NULL,
    "scope" "BackupScope" NOT NULL,
    "churchId" TEXT,
    "trigger" "BackupTrigger" NOT NULL,
    "status" "BackupJobStatus" NOT NULL DEFAULT 'QUEUED',
    "triggeredById" TEXT,
    "requestId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "bytesTotal" BIGINT NOT NULL DEFAULT 0,
    "checksumSha256" TEXT,
    "errorSummary" TEXT,
    "warningSummary" TEXT,
    "tablesExported" INTEGER,
    "mediaFilesOk" INTEGER,
    "mediaFilesFail" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backup_artifacts" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "BackupArtifactType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "byteSize" BIGINT NOT NULL DEFAULT 0,
    "checksumSha256" TEXT,
    "downloadTokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "backup_schedules_church_scope_unique"
  ON "backup_schedules"("churchId", "scope")
  WHERE "churchId" IS NOT NULL;

CREATE UNIQUE INDEX "backup_schedules_global_scope_unique"
  ON "backup_schedules"("scope")
  WHERE "churchId" IS NULL;

CREATE INDEX "backup_schedules_enabled_nextRunAt_idx" ON "backup_schedules"("enabled", "nextRunAt");

CREATE INDEX "backup_requests_status_createdAt_idx" ON "backup_requests"("status", "createdAt");
CREATE INDEX "backup_requests_churchId_createdAt_idx" ON "backup_requests"("churchId", "createdAt");

CREATE UNIQUE INDEX "backup_jobs_requestId_key" ON "backup_jobs"("requestId");
CREATE INDEX "backup_jobs_scope_status_createdAt_idx" ON "backup_jobs"("scope", "status", "createdAt");
CREATE INDEX "backup_jobs_churchId_createdAt_idx" ON "backup_jobs"("churchId", "createdAt");
CREATE INDEX "backup_jobs_status_createdAt_idx" ON "backup_jobs"("status", "createdAt");

CREATE INDEX "backup_artifacts_jobId_idx" ON "backup_artifacts"("jobId");

ALTER TABLE "backup_schedules" ADD CONSTRAINT "backup_schedules_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backup_schedules" ADD CONSTRAINT "backup_schedules_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "backup_requests" ADD CONSTRAINT "backup_requests_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backup_requests" ADD CONSTRAINT "backup_requests_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backup_requests" ADD CONSTRAINT "backup_requests_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_triggeredById_fkey"
  FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "backup_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "backup_artifacts" ADD CONSTRAINT "backup_artifacts_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "backup_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default global full-DB nightly schedule (02:00 UTC)
INSERT INTO "backup_schedules" (
  "id", "churchId", "scope", "enabled", "frequency", "hourUtc", "minuteUtc",
  "timezone", "retentionDays", "nextRunAt", "createdAt", "updatedAt"
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  NULL,
  'FULL_DB',
  true,
  'DAILY',
  2,
  0,
  'UTC',
  30,
  (date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day' + INTERVAL '2 hours') AT TIME ZONE 'UTC',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
