-- Phase 8 — Department tools (attendance, absentee notify, weekly reports, volunteer consistency)

CREATE TYPE "DepartmentCode" AS ENUM (
  'USHERING',
  'CHOIR',
  'EVANGELISM',
  'YOUTH',
  'TEENS',
  'CHILDREN',
  'PROTOCOL',
  'PRAYER',
  'MEDIA',
  'OTHER'
);

ALTER TABLE "service_units" ADD COLUMN IF NOT EXISTS "departmentCode" "DepartmentCode";

CREATE TABLE "service_unit_weekly_reports" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "body" TEXT NOT NULL,
  "stats" JSONB NOT NULL DEFAULT '{}',
  "emailedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_unit_weekly_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_unit_weekly_reports_serviceUnitId_weekStart_key"
  ON "service_unit_weekly_reports"("serviceUnitId", "weekStart");
CREATE INDEX "service_unit_weekly_reports_churchId_weekStart_idx"
  ON "service_unit_weekly_reports"("churchId", "weekStart");

ALTER TABLE "service_unit_weekly_reports" ADD CONSTRAINT "service_unit_weekly_reports_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_weekly_reports" ADD CONSTRAINT "service_unit_weekly_reports_serviceUnitId_fkey"
  FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Map existing catalog units to Phase 8 department codes
UPDATE "service_units" SET "departmentCode" = 'USHERING' WHERE "name" = 'Ushering';
UPDATE "service_units" SET "departmentCode" = 'CHOIR' WHERE "name" = 'Choir';
UPDATE "service_units" SET "departmentCode" = 'EVANGELISM' WHERE "name" = 'Harvesters Squad';
UPDATE "service_units" SET "departmentCode" = 'TEENS' WHERE "name" = 'Teens'' Church';
UPDATE "service_units" SET "departmentCode" = 'CHILDREN' WHERE "name" = 'Children''s Church Teachers';
UPDATE "service_units" SET "departmentCode" = 'PROTOCOL' WHERE "name" = 'Protocol';
UPDATE "service_units" SET "departmentCode" = 'PRAYER' WHERE "name" = 'Prayer Squad';
UPDATE "service_units" SET "departmentCode" = 'MEDIA' WHERE "name" = 'Media';

ALTER TYPE "CommunicationQueueKind" ADD VALUE IF NOT EXISTS 'DEPARTMENT_ABSENTEE';
ALTER TYPE "CommunicationQueueKind" ADD VALUE IF NOT EXISTS 'DEPARTMENT_WEEKLY_REPORT';
