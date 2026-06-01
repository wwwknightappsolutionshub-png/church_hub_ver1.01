-- CreateEnum
CREATE TYPE "SyncConflictStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SyncConflictResolution" AS ENUM ('CLIENT_WINS', 'SERVER_WINS', 'MERGED');

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "outreachContactId" TEXT,
    "serverPayload" JSONB NOT NULL,
    "clientPayload" JSONB NOT NULL,
    "mergedPayload" JSONB,
    "status" "SyncConflictStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" "SyncConflictResolution",
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_conflicts_churchId_status_idx" ON "sync_conflicts"("churchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sync_conflicts_churchId_clientId_entityType_key" ON "sync_conflicts"("churchId", "clientId", "entityType");

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_outreachContactId_fkey" FOREIGN KEY ("outreachContactId") REFERENCES "outreach_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
