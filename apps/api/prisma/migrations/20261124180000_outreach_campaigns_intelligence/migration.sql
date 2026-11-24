-- CreateEnum
CREATE TYPE "OutreachCaptureSource" AS ENUM ('MANUAL', 'SYNC', 'IMPORT', 'PUBLIC_QR');

-- CreateTable
CREATE TABLE "outreach_campaigns" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_campaigns_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "outreach_contacts" ADD COLUMN "campaignId" TEXT,
ADD COLUMN "captureSource" "OutreachCaptureSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "capturedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "outreach_campaigns_churchId_isActive_idx" ON "outreach_campaigns"("churchId", "isActive");

CREATE INDEX "outreach_contacts_churchId_campaignId_idx" ON "outreach_contacts"("churchId", "campaignId");

CREATE INDEX "outreach_contacts_capturedByUserId_idx" ON "outreach_contacts"("capturedByUserId");

-- AddForeignKey
ALTER TABLE "outreach_campaigns" ADD CONSTRAINT "outreach_campaigns_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outreach_campaigns" ADD CONSTRAINT "outreach_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "outreach_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_capturedByUserId_fkey" FOREIGN KEY ("capturedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;