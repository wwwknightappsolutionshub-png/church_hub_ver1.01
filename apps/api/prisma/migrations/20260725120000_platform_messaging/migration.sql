-- Platform broadcasts, support chat, and push subscriptions

CREATE TYPE "PlatformSupportStatus" AS ENUM ('OPEN', 'PENDING_PLATFORM', 'PENDING_TENANT', 'CLOSED');

CREATE TABLE IF NOT EXISTS "platform_broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "sendEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "notificationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "platform_broadcast_deliveries" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    CONSTRAINT "platform_broadcast_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "platform_support_threads" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "PlatformSupportStatus" NOT NULL DEFAULT 'OPEN',
    "createdByUserId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_support_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "platform_support_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderSide" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_support_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_broadcasts_createdAt_idx" ON "platform_broadcasts"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "platform_broadcast_deliveries_broadcastId_churchId_key" ON "platform_broadcast_deliveries"("broadcastId", "churchId");
CREATE INDEX IF NOT EXISTS "platform_broadcast_deliveries_churchId_idx" ON "platform_broadcast_deliveries"("churchId");
CREATE INDEX IF NOT EXISTS "platform_support_threads_churchId_status_lastMessageAt_idx" ON "platform_support_threads"("churchId", "status", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "platform_support_threads_status_lastMessageAt_idx" ON "platform_support_threads"("status", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "platform_support_messages_threadId_createdAt_idx" ON "platform_support_messages"("threadId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_userId_endpoint_key" ON "push_subscriptions"("userId", "endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

DO $$ BEGIN
  ALTER TABLE "platform_broadcasts" ADD CONSTRAINT "platform_broadcasts_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "platform_broadcast_deliveries" ADD CONSTRAINT "platform_broadcast_deliveries_broadcastId_fkey"
    FOREIGN KEY ("broadcastId") REFERENCES "platform_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "platform_broadcast_deliveries" ADD CONSTRAINT "platform_broadcast_deliveries_churchId_fkey"
    FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "platform_support_threads" ADD CONSTRAINT "platform_support_threads_churchId_fkey"
    FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "platform_support_threads" ADD CONSTRAINT "platform_support_threads_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "platform_support_messages" ADD CONSTRAINT "platform_support_messages_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "platform_support_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "platform_support_messages" ADD CONSTRAINT "platform_support_messages_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
