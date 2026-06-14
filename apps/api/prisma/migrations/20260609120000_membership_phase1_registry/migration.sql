-- CreateEnum
CREATE TYPE "MemberGender" AS ENUM ('UNKNOWN', 'MALE', 'FEMALE');
CREATE TYPE "MembershipCustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'PHONE', 'LINK');

-- AlterTable families
ALTER TABLE "families" ADD COLUMN "address" TEXT;
ALTER TABLE "families" ADD COLUMN "address2" TEXT;
ALTER TABLE "families" ADD COLUMN "city" TEXT;
ALTER TABLE "families" ADD COLUMN "state" TEXT;
ALTER TABLE "families" ADD COLUMN "zip" TEXT;
ALTER TABLE "families" ADD COLUMN "country" TEXT;
ALTER TABLE "families" ADD COLUMN "homePhone" TEXT;
ALTER TABLE "families" ADD COLUMN "email" TEXT;
ALTER TABLE "families" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable members
ALTER TABLE "members" ADD COLUMN "classificationId" TEXT;
ALTER TABLE "members" ADD COLUMN "familyRoleId" TEXT;
ALTER TABLE "members" ADD COLUMN "title" TEXT;
ALTER TABLE "members" ADD COLUMN "middleName" TEXT;
ALTER TABLE "members" ADD COLUMN "suffix" TEXT;
ALTER TABLE "members" ADD COLUMN "gender" "MemberGender" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "members" ADD COLUMN "workEmail" TEXT;
ALTER TABLE "members" ADD COLUMN "homePhone" TEXT;
ALTER TABLE "members" ADD COLUMN "workPhone" TEXT;
ALTER TABLE "members" ADD COLUMN "cellPhone" TEXT;
ALTER TABLE "members" ADD COLUMN "hideAge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN "membershipDate" TIMESTAMP(3);
ALTER TABLE "members" ADD COLUMN "friendDate" TIMESTAMP(3);
ALTER TABLE "members" ADD COLUMN "address2" TEXT;
ALTER TABLE "members" ADD COLUMN "state" TEXT;
ALTER TABLE "members" ADD COLUMN "zip" TEXT;
ALTER TABLE "members" ADD COLUMN "country" TEXT;
ALTER TABLE "members" ADD COLUMN "facebook" TEXT;
ALTER TABLE "members" ADD COLUMN "twitter" TEXT;
ALTER TABLE "members" ADD COLUMN "linkedIn" TEXT;

-- CreateTable congregant_classifications
CREATE TABLE "congregant_classifications" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isInactive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "congregant_classifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_role_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "family_role_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_custom_field_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "MembershipCustomFieldType" NOT NULL DEFAULT 'TEXT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "member_custom_field_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_custom_field_values" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "valueText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "member_custom_field_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_custom_field_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "MembershipCustomFieldType" NOT NULL DEFAULT 'TEXT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "family_custom_field_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_custom_field_values" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "valueText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "family_custom_field_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_property_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "member_property_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_property_assignments" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_property_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_property_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "family_property_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_property_assignments" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "family_property_assignments_pkey" PRIMARY KEY ("id")
);

-- Indexes & FKs
CREATE UNIQUE INDEX "congregant_classifications_churchId_code_key" ON "congregant_classifications"("churchId", "code");
CREATE INDEX "congregant_classifications_churchId_isActive_sortOrder_idx" ON "congregant_classifications"("churchId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "family_role_definitions_churchId_code_key" ON "family_role_definitions"("churchId", "code");
CREATE INDEX "family_role_definitions_churchId_isActive_sortOrder_idx" ON "family_role_definitions"("churchId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "member_custom_field_definitions_churchId_fieldKey_key" ON "member_custom_field_definitions"("churchId", "fieldKey");
CREATE INDEX "member_custom_field_definitions_churchId_isActive_sortOrder_idx" ON "member_custom_field_definitions"("churchId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "member_custom_field_values_memberId_definitionId_key" ON "member_custom_field_values"("memberId", "definitionId");

CREATE UNIQUE INDEX "family_custom_field_definitions_churchId_fieldKey_key" ON "family_custom_field_definitions"("churchId", "fieldKey");
CREATE INDEX "family_custom_field_definitions_churchId_isActive_sortOrder_idx" ON "family_custom_field_definitions"("churchId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "family_custom_field_values_familyId_definitionId_key" ON "family_custom_field_values"("familyId", "definitionId");

CREATE UNIQUE INDEX "member_property_definitions_churchId_name_key" ON "member_property_definitions"("churchId", "name");
CREATE INDEX "member_property_definitions_churchId_isActive_sortOrder_idx" ON "member_property_definitions"("churchId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "member_property_assignments_memberId_definitionId_key" ON "member_property_assignments"("memberId", "definitionId");

CREATE UNIQUE INDEX "family_property_definitions_churchId_name_key" ON "family_property_definitions"("churchId", "name");
CREATE INDEX "family_property_definitions_churchId_isActive_sortOrder_idx" ON "family_property_definitions"("churchId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "family_property_assignments_familyId_definitionId_key" ON "family_property_assignments"("familyId", "definitionId");

ALTER TABLE "congregant_classifications" ADD CONSTRAINT "congregant_classifications_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_role_definitions" ADD CONSTRAINT "family_role_definitions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_custom_field_definitions" ADD CONSTRAINT "member_custom_field_definitions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_custom_field_values" ADD CONSTRAINT "member_custom_field_values_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_custom_field_values" ADD CONSTRAINT "member_custom_field_values_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "member_custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_custom_field_definitions" ADD CONSTRAINT "family_custom_field_definitions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_custom_field_values" ADD CONSTRAINT "family_custom_field_values_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_custom_field_values" ADD CONSTRAINT "family_custom_field_values_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "family_custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_property_definitions" ADD CONSTRAINT "member_property_definitions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_property_assignments" ADD CONSTRAINT "member_property_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_property_assignments" ADD CONSTRAINT "member_property_assignments_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "member_property_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_property_definitions" ADD CONSTRAINT "family_property_definitions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_property_assignments" ADD CONSTRAINT "family_property_assignments_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_property_assignments" ADD CONSTRAINT "family_property_assignments_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "family_property_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "members" ADD CONSTRAINT "members_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "congregant_classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_familyRoleId_fkey" FOREIGN KEY ("familyRoleId") REFERENCES "family_role_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
