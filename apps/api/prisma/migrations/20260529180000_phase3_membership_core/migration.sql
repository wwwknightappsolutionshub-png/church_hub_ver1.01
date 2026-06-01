-- CreateEnum
CREATE TYPE "MemberActivityType" AS ENUM ('MEMBER_CREATED', 'MEMBER_UPDATED', 'STATUS_CHANGED', 'ONBOARDING_STEP', 'ONBOARDING_COMPLETED', 'FAMILY_LINKED', 'FAMILY_CREATED', 'GUARDIAN_LINKED', 'GUARDIAN_REMOVED', 'CLASS_ENROLLED', 'CLASS_COMPLETED', 'CLASS_WITHDRAWN', 'ATTENDANCE_RECORDED', 'MEMBER_DELETED');

-- CreateEnum
CREATE TYPE "ClassEnrollmentStatus" AS ENUM ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AttendanceScope" AS ENUM ('SERVICE', 'FAMILY', 'DEPARTMENT');

-- CreateTable
CREATE TABLE "member_activity_logs" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "MemberActivityType" NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_enrollments" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "classDefinitionId" TEXT NOT NULL,
    "status" "ClassEnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "churchServiceId" TEXT,
    "serviceUnitId" TEXT,
    "familyId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "scope" "AttendanceScope" NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_activity_logs_churchId_memberId_createdAt_idx" ON "member_activity_logs"("churchId", "memberId", "createdAt");

-- CreateIndex
CREATE INDEX "member_activity_logs_memberId_createdAt_idx" ON "member_activity_logs"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "class_enrollments_churchId_classDefinitionId_status_idx" ON "class_enrollments"("churchId", "classDefinitionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_memberId_classDefinitionId_key" ON "class_enrollments"("memberId", "classDefinitionId");

-- CreateIndex
CREATE INDEX "attendance_records_churchId_serviceDate_idx" ON "attendance_records"("churchId", "serviceDate");

-- CreateIndex
CREATE INDEX "attendance_records_churchId_churchServiceId_serviceDate_idx" ON "attendance_records"("churchId", "churchServiceId", "serviceDate");

-- CreateIndex
CREATE INDEX "attendance_records_familyId_serviceDate_idx" ON "attendance_records"("familyId", "serviceDate");

-- CreateIndex
CREATE INDEX "attendance_records_serviceUnitId_serviceDate_idx" ON "attendance_records"("serviceUnitId", "serviceDate");

-- CreateIndex
CREATE INDEX "attendance_records_memberId_churchServiceId_serviceDate_scope_idx" ON "attendance_records"("memberId", "churchServiceId", "serviceDate", "scope");

-- AddForeignKey
ALTER TABLE "member_activity_logs" ADD CONSTRAINT "member_activity_logs_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_activity_logs" ADD CONSTRAINT "member_activity_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_activity_logs" ADD CONSTRAINT "member_activity_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_classDefinitionId_fkey" FOREIGN KEY ("classDefinitionId") REFERENCES "membership_class_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_churchServiceId_fkey" FOREIGN KEY ("churchServiceId") REFERENCES "church_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
