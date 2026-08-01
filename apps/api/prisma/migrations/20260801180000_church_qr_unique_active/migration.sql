-- Enforce one active church-wide Team QR per church; deactivate legacy personal QRs

UPDATE "evangelist_qr_codes"
SET "isActive" = false
WHERE "isChurchWide" = false AND "isActive" = true;

-- Keep oldest church-wide QR active; deactivate duplicates
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "churchId" ORDER BY "createdAt" ASC) AS rn
  FROM "evangelist_qr_codes"
  WHERE "isChurchWide" = true AND "isActive" = true
)
UPDATE "evangelist_qr_codes" e
SET "isActive" = false
FROM ranked r
WHERE e.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "evangelist_qr_codes_church_wide_active_unique"
ON "evangelist_qr_codes" ("churchId")
WHERE "isChurchWide" = true AND "isActive" = true;
