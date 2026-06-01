-- Medical department: incident categories, member linking, follow-up, recovery, team attendance

CREATE TYPE "MedicalIncidentCategory" AS ENUM (
  'DIZZINESS',
  'FAINTING',
  'INJURY',
  'ASTHMA_CRISIS',
  'ALLERGIC_REACTION',
  'CHEST_PAIN',
  'SEIZURE',
  'HYPERTENSION',
  'NAUSEA',
  'OTHER'
);

CREATE TYPE "MedicalRecoveryStatus" AS ENUM (
  'NOT_APPLICABLE',
  'MONITORING',
  'IMPROVING',
  'STABLE',
  'RECOVERED',
  'CRITICAL'
);

ALTER TABLE "dept_incidents" ADD COLUMN IF NOT EXISTS "subjectMemberId" TEXT;
ALTER TABLE "dept_incidents" ADD COLUMN IF NOT EXISTS "category" "MedicalIncidentCategory" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "dept_incidents" ADD COLUMN IF NOT EXISTS "followUpRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dept_incidents" ADD COLUMN IF NOT EXISTS "recoveryStatus" "MedicalRecoveryStatus" NOT NULL DEFAULT 'NOT_APPLICABLE';
ALTER TABLE "dept_incidents" ADD COLUMN IF NOT EXISTS "prayerTeamRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dept_incidents" ADD COLUMN IF NOT EXISTS "leadershipNotifiedAt" TIMESTAMP(3);
ALTER TABLE "dept_incidents" ADD COLUMN IF NOT EXISTS "recoveryUpdatedAt" TIMESTAMP(3);
ALTER TABLE "dept_incidents" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "dept_incidents_churchId_category_idx" ON "dept_incidents"("churchId", "category");
CREATE INDEX IF NOT EXISTS "dept_incidents_subjectMemberId_idx" ON "dept_incidents"("subjectMemberId");

DO $$ BEGIN
  ALTER TABLE "dept_incidents" ADD CONSTRAINT "dept_incidents_subjectMemberId_fkey"
    FOREIGN KEY ("subjectMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "dept_medical_team_attendance" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "role" TEXT,
  "notes" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_medical_team_attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dept_medical_team_attendance_serviceUnitId_memberId_serviceDate_key"
  ON "dept_medical_team_attendance"("serviceUnitId", "memberId", "serviceDate");
CREATE INDEX "dept_medical_team_attendance_serviceUnitId_serviceDate_idx"
  ON "dept_medical_team_attendance"("serviceUnitId", "serviceDate");

CREATE TABLE "dept_medical_recovery_logs" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "status" "MedicalRecoveryStatus" NOT NULL,
  "note" TEXT,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dept_medical_recovery_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dept_medical_recovery_logs_incidentId_createdAt_idx"
  ON "dept_medical_recovery_logs"("incidentId", "createdAt");

ALTER TABLE "dept_medical_team_attendance" ADD CONSTRAINT "dept_medical_team_attendance_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_medical_team_attendance" ADD CONSTRAINT "dept_medical_team_attendance_serviceUnitId_fkey"
  FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_medical_team_attendance" ADD CONSTRAINT "dept_medical_team_attendance_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_medical_team_attendance" ADD CONSTRAINT "dept_medical_team_attendance_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dept_medical_recovery_logs" ADD CONSTRAINT "dept_medical_recovery_logs_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "dept_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_medical_recovery_logs" ADD CONSTRAINT "dept_medical_recovery_logs_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
