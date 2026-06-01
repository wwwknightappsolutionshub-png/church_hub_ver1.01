-- SaaS platform admin (no church) + church staff management

ALTER TABLE "users" ALTER COLUMN "churchId" DROP NOT NULL;

INSERT INTO "roles" ("id", "name", "description")
SELECT gen_random_uuid()::text, 'PLATFORM_ADMIN', 'SaaS platform operator — all churches'
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'PLATFORM_ADMIN');

INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT gen_random_uuid()::text, r."id", 'platform', '*'
FROM "roles" r
WHERE r."name" = 'PLATFORM_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "permissions" p
    WHERE p."roleId" = r."id" AND p."resource" = 'platform' AND p."action" = '*'
  );
