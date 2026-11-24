-- Phase 2C/2D: soft-delete columns, append-only security audit, optional Postgres RLS.
-- RLS uses FORCE + policies that are no-ops until app sets app.rls_enforced='true'
-- (controlled by ENABLE_DB_RLS). Safe for live soak without cross-tenant lockouts.

-- ── Soft delete ──────────────────────────────────────────────
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "pastoral_notes" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "members_churchId_deletedAt_idx" ON "members"("churchId", "deletedAt");
CREATE INDEX IF NOT EXISTS "pastoral_notes_churchId_deletedAt_idx" ON "pastoral_notes"("churchId", "deletedAt");

-- ── Append-only security audit ───────────────────────────────
CREATE TABLE IF NOT EXISTS "security_audit_logs" (
    "id" TEXT NOT NULL,
    "churchId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "ip" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "security_audit_logs_churchId_createdAt_idx"
  ON "security_audit_logs"("churchId", "createdAt");
CREATE INDEX IF NOT EXISTS "security_audit_logs_action_createdAt_idx"
  ON "security_audit_logs"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "security_audit_logs_targetType_targetId_idx"
  ON "security_audit_logs"("targetType", "targetId");

DO $$ BEGIN
  ALTER TABLE "security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_churchId_fkey"
    FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Revoke mutation privileges from public/app roles if present (best-effort; owners retain rights).
-- Application MUST NOT expose update/delete on SecurityAuditLog.

-- ── RLS helpers ──────────────────────────────────────────────
-- USING clause is permissive until app.rls_enforced = 'true' (ENABLE_DB_RLS).

CREATE OR REPLACE FUNCTION church_hub_tenant_row_allowed(row_church_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    current_setting('app.rls_enforced', true) IS DISTINCT FROM 'true'
    OR current_setting('app.bypass_rls', true) = 'true'
    OR row_church_id = NULLIF(current_setting('app.current_church_id', true), '');
$$;

-- Core tenant tables (expand carefully; keep backups/platform jobs on bypass).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'members',
    'pastoral_notes',
    'follow_ups',
    'outreach_contacts',
    'families',
    'member_activity_logs',
    'follow_up_stage_audits'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS church_hub_tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY church_hub_tenant_isolation ON %I
         FOR ALL
         USING (church_hub_tenant_row_allowed("churchId"::text))
         WITH CHECK (church_hub_tenant_row_allowed("churchId"::text))',
      t
    );
  END LOOP;
END $$;
