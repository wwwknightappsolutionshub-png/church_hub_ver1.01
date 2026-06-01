-- Phase 7 — Communication queue, conversations, automations

CREATE TYPE "CommunicationQueueKind" AS ENUM (
  'BROADCAST',
  'DEPARTMENT_BROADCAST',
  'ABSENTEE_FOLLOWUP',
  'SERVICE_REMINDER',
  'DIRECT_ALERT'
);

CREATE TYPE "CommunicationQueueStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED'
);

CREATE TABLE "communication_queue_items" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "kind" "CommunicationQueueKind" NOT NULL,
  "status" "CommunicationQueueStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "channels" TEXT[] DEFAULT ARRAY['IN_APP']::TEXT[],
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "serviceUnitId" TEXT,
  "targetUserId" TEXT,
  "targetMemberId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "lastError" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "communication_queue_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "participantAId" TEXT NOT NULL,
  "participantBId" TEXT NOT NULL,
  "subject" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversations_churchId_participantAId_participantBId_key"
  ON "conversations"("churchId", "participantAId", "participantBId");
CREATE INDEX "communication_queue_items_churchId_status_scheduledAt_idx"
  ON "communication_queue_items"("churchId", "status", "scheduledAt");
CREATE INDEX "conversations_churchId_lastMessageAt_idx"
  ON "conversations"("churchId", "lastMessageAt");
CREATE INDEX "conversation_messages_conversationId_createdAt_idx"
  ON "conversation_messages"("conversationId", "createdAt");

ALTER TABLE "communication_queue_items" ADD CONSTRAINT "communication_queue_items_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_queue_items" ADD CONSTRAINT "communication_queue_items_serviceUnitId_fkey"
  FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
