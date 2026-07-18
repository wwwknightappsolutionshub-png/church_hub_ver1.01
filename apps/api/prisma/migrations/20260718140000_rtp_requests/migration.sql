-- CreateEnum
CREATE TYPE "RtpRequestStatus" AS ENUM ('SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RtpFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'CURRENCY');

-- CreateTable
CREATE TABLE "rtp_form_field_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "RtpFieldType" NOT NULL DEFAULT 'TEXT',
    "sectionKey" TEXT NOT NULL,
    "sectionLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rtp_form_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rtp_requests" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "RtpRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "fieldValues" JSONB NOT NULL DEFAULT '{}',
    "receivedAt" TIMESTAMP(3),
    "receivedByUserId" TEXT,
    "processingNotifiedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "lastReminderAt" TIMESTAMP(3),
    "nextReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rtp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rtp_form_field_definitions_churchId_isActive_sortOrder_idx" ON "rtp_form_field_definitions"("churchId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "rtp_form_field_definitions_churchId_fieldKey_key" ON "rtp_form_field_definitions"("churchId", "fieldKey");

-- CreateIndex
CREATE INDEX "rtp_requests_churchId_status_createdAt_idx" ON "rtp_requests"("churchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "rtp_requests_serviceUnitId_createdAt_idx" ON "rtp_requests"("serviceUnitId", "createdAt");

-- CreateIndex
CREATE INDEX "rtp_requests_status_nextReminderAt_idx" ON "rtp_requests"("status", "nextReminderAt");

-- AddForeignKey
ALTER TABLE "rtp_form_field_definitions" ADD CONSTRAINT "rtp_form_field_definitions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtp_requests" ADD CONSTRAINT "rtp_requests_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtp_requests" ADD CONSTRAINT "rtp_requests_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtp_requests" ADD CONSTRAINT "rtp_requests_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtp_requests" ADD CONSTRAINT "rtp_requests_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtp_requests" ADD CONSTRAINT "rtp_requests_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
