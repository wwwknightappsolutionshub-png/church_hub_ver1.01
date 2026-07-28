-- Platform custom roles: scope + system flag on roles
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'TENANT';
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;

UPDATE "roles" SET "scope" = 'PLATFORM', "isSystem" = true
WHERE "name" = 'PLATFORM_ADMIN';

CREATE INDEX IF NOT EXISTS "roles_scope_idx" ON "roles"("scope");
