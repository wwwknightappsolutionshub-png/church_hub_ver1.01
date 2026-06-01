ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "bio" TEXT;

CREATE TYPE "ServiceUnitEmailTemplateType" AS ENUM ('WELCOME');
CREATE TYPE "CommunityHubType" AS ENUM ('PRAYER', 'PRAISE');
CREATE TYPE "CommunityHubStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "service_unit_email_templates" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "type" "ServiceUnitEmailTemplateType" NOT NULL DEFAULT 'WELCOME',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_unit_email_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_unit_email_templates_serviceUnitId_type_key" ON "service_unit_email_templates"("serviceUnitId", "type");

CREATE TABLE "community_hub_posts" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "type" "CommunityHubType" NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorMemberId" TEXT,
    "subject" TEXT,
    "testimony" TEXT,
    "description" TEXT NOT NULL,
    "displayName" TEXT,
    "showDisplayName" BOOLEAN NOT NULL DEFAULT false,
    "status" "CommunityHubStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "autoApproveAt" TIMESTAMP(3) NOT NULL,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_hub_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_hub_posts_churchId_type_status_createdAt_idx" ON "community_hub_posts"("churchId", "type", "status", "createdAt");
CREATE INDEX "community_hub_posts_authorUserId_type_idx" ON "community_hub_posts"("authorUserId", "type");

ALTER TABLE "service_unit_email_templates" ADD CONSTRAINT "service_unit_email_templates_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_email_templates" ADD CONSTRAINT "service_unit_email_templates_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_hub_posts" ADD CONSTRAINT "community_hub_posts_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_hub_posts" ADD CONSTRAINT "community_hub_posts_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
