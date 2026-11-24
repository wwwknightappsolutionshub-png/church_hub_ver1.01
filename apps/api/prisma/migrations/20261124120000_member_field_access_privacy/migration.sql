-- Member field access policies (platform global / per-tenant / church) — additive

CREATE TYPE "MemberFieldPolicyScope" AS ENUM ('PLATFORM_GLOBAL', 'PLATFORM_TENANT', 'CHURCH');
CREATE TYPE "MemberFieldVisibility" AS ENUM ('VISIBLE', 'RESTRICTED', 'HIDDEN');
CREATE TYPE "MemberFieldEditability" AS ENUM ('EDITABLE', 'READ_ONLY', 'LOCKED');

CREATE TABLE IF NOT EXISTS "member_field_access_policies" (
    "id" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "scope" "MemberFieldPolicyScope" NOT NULL,
    "churchId" TEXT,
    "fieldKey" TEXT NOT NULL,
    "visibility" "MemberFieldVisibility" NOT NULL DEFAULT 'VISIBLE',
    "editability" "MemberFieldEditability" NOT NULL DEFAULT 'EDITABLE',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_field_access_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "member_field_access_policies_policyKey_key"
  ON "member_field_access_policies"("policyKey");

CREATE INDEX IF NOT EXISTS "member_field_access_policies_scope_churchId_idx"
  ON "member_field_access_policies"("scope", "churchId");

CREATE INDEX IF NOT EXISTS "member_field_access_policies_churchId_fieldKey_idx"
  ON "member_field_access_policies"("churchId", "fieldKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'member_field_access_policies_churchId_fkey'
  ) THEN
    ALTER TABLE "member_field_access_policies"
      ADD CONSTRAINT "member_field_access_policies_churchId_fkey"
      FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'member_field_access_policies_updatedById_fkey'
  ) THEN
    ALTER TABLE "member_field_access_policies"
      ADD CONSTRAINT "member_field_access_policies_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
