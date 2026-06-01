-- Service unit access: unit admins, join requests, meeting summaries

CREATE TYPE "ServiceUnitJoinStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "service_unit_leaders" ADD COLUMN IF NOT EXISTS "isUnitAdmin" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "service_unit_join_requests" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "memberId" TEXT,
    "requesterUserId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "motivation" TEXT,
    "status" "ServiceUnitJoinStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_unit_join_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_unit_meeting_summaries" (
    "id" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "meetingId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_unit_meeting_summaries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_unit_join_requests_serviceUnitId_status_idx" ON "service_unit_join_requests"("serviceUnitId", "status");
CREATE INDEX "service_unit_meeting_summaries_serviceUnitId_meetingDate_idx" ON "service_unit_meeting_summaries"("serviceUnitId", "meetingDate");

ALTER TABLE "service_unit_join_requests" ADD CONSTRAINT "service_unit_join_requests_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_join_requests" ADD CONSTRAINT "service_unit_join_requests_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_join_requests" ADD CONSTRAINT "service_unit_join_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_unit_join_requests" ADD CONSTRAINT "service_unit_join_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_unit_meeting_summaries" ADD CONSTRAINT "service_unit_meeting_summaries_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_meeting_summaries" ADD CONSTRAINT "service_unit_meeting_summaries_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_meeting_summaries" ADD CONSTRAINT "service_unit_meeting_summaries_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "service_unit_meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_unit_meeting_summaries" ADD CONSTRAINT "service_unit_meeting_summaries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
