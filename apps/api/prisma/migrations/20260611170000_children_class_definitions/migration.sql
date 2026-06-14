-- Configurable Children's Church class definitions per service unit

CREATE TABLE "dept_children_class_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dept_children_class_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dept_children_class_definitions_serviceUnitId_code_key"
  ON "dept_children_class_definitions"("serviceUnitId", "code");
CREATE INDEX "dept_children_class_definitions_serviceUnitId_isActive_sortOrder_idx"
  ON "dept_children_class_definitions"("serviceUnitId", "isActive", "sortOrder");

ALTER TABLE "dept_children_class_definitions"
  ADD CONSTRAINT "dept_children_class_definitions_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_children_class_definitions"
  ADD CONSTRAINT "dept_children_class_definitions_serviceUnitId_fkey"
  FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Convert enum columns to text (preserves existing AGES_* values)
ALTER TABLE "dept_children_duty_rosters"
  ALTER COLUMN "classGroup" TYPE TEXT USING "classGroup"::TEXT;
ALTER TABLE "dept_children_curriculum"
  ALTER COLUMN "targetClassGroup" TYPE TEXT USING "targetClassGroup"::TEXT;
ALTER TABLE "dept_children_class_reports"
  ALTER COLUMN "classGroup" TYPE TEXT USING "classGroup"::TEXT;
ALTER TABLE "dept_children_class_enrollments"
  ALTER COLUMN "classGroup" TYPE TEXT USING "classGroup"::TEXT;

DROP TYPE IF EXISTS "ChildrenClassGroup";

-- Seed default classes for each Children's Church service unit
INSERT INTO "dept_children_class_definitions" (
  "id", "churchId", "serviceUnitId", "code", "name", "minAge", "maxAge", "sortOrder", "isSystem", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  su."churchId",
  su.id,
  defs.code,
  defs.name,
  defs."minAge",
  defs."maxAge",
  defs."sortOrder",
  true,
  CURRENT_TIMESTAMP
FROM "service_units" su
CROSS JOIN (
  VALUES
    ('AGES_3_5', 'Ages 3–5', 3, 5, 1),
    ('AGES_6_9', 'Ages 6–9', 6, 9, 2),
    ('AGES_10_12', 'Ages 10–12', 10, 12, 3)
) AS defs(code, name, "minAge", "maxAge", "sortOrder")
WHERE su."departmentCode" = 'CHILDREN' OR su.name ILIKE '%children%church%';
