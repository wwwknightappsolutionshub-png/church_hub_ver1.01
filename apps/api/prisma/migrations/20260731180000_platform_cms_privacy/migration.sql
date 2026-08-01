-- CreateEnum
CREATE TYPE "PlatformCmsPageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PlatformCmsPageKind" AS ENUM ('PRIVACY', 'TERMS', 'COOKIE', 'DPA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PRIVACY', 'TERMS', 'COOKIES', 'MARKETING');

-- CreateEnum
CREATE TYPE "DsarRequestType" AS ENUM ('ACCESS', 'ERASURE', 'RECTIFICATION');

-- CreateEnum
CREATE TYPE "DsarRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "anonymizedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "platform_cms_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "htmlBody" TEXT NOT NULL,
    "status" "PlatformCmsPageStatus" NOT NULL DEFAULT 'DRAFT',
    "kind" "PlatformCmsPageKind" NOT NULL DEFAULT 'CUSTOM',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consent_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "churchId" TEXT,
    "email" TEXT,
    "consentType" "ConsentType" NOT NULL,
    "documentSlug" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL DEFAULT 1,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_dsar_requests" (
    "id" TEXT NOT NULL,
    "churchId" TEXT,
    "userId" TEXT,
    "requesterEmail" TEXT NOT NULL,
    "requesterName" TEXT,
    "type" "DsarRequestType" NOT NULL,
    "status" "DsarRequestStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "handledById" TEXT,

    CONSTRAINT "platform_dsar_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_cms_pages_slug_key" ON "platform_cms_pages"("slug");

-- CreateIndex
CREATE INDEX "platform_cms_pages_status_kind_idx" ON "platform_cms_pages"("status", "kind");

-- CreateIndex
CREATE INDEX "user_consent_records_userId_consentType_idx" ON "user_consent_records"("userId", "consentType");

-- CreateIndex
CREATE INDEX "user_consent_records_email_idx" ON "user_consent_records"("email");

-- CreateIndex
CREATE INDEX "user_consent_records_churchId_idx" ON "user_consent_records"("churchId");

-- CreateIndex
CREATE INDEX "platform_dsar_requests_status_createdAt_idx" ON "platform_dsar_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "platform_dsar_requests_userId_idx" ON "platform_dsar_requests"("userId");

-- AddForeignKey
ALTER TABLE "platform_cms_pages" ADD CONSTRAINT "platform_cms_pages_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consent_records" ADD CONSTRAINT "user_consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consent_records" ADD CONSTRAINT "user_consent_records_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_dsar_requests" ADD CONSTRAINT "platform_dsar_requests_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_dsar_requests" ADD CONSTRAINT "platform_dsar_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_dsar_requests" ADD CONSTRAINT "platform_dsar_requests_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
