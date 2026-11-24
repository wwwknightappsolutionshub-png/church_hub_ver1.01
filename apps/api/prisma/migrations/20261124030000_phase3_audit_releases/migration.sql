-- Phase 3: audit query indexes + PlatformBroadcast release metadata (additive)

CREATE INDEX IF NOT EXISTS "security_audit_logs_actorId_createdAt_idx"
  ON "security_audit_logs"("actorId", "createdAt");

CREATE INDEX IF NOT EXISTS "security_audit_logs_ip_createdAt_idx"
  ON "security_audit_logs"("ip", "createdAt");

ALTER TABLE "platform_broadcasts"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'BROADCAST',
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "version" TEXT;

CREATE INDEX IF NOT EXISTS "platform_broadcasts_kind_createdAt_idx"
  ON "platform_broadcasts"("kind", "createdAt");
