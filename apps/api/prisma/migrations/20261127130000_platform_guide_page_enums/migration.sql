-- The first guide-page migration stored kind and status as text.
-- Prisma expects the enums declared on PlatformGuidePage.

DO $$ BEGIN
  CREATE TYPE "PlatformGuideKind" AS ENUM ('ABOUT', 'POST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlatformGuideStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "platform_guide_pages" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "platform_guide_pages"
  ALTER COLUMN "kind" TYPE "PlatformGuideKind" USING "kind"::"PlatformGuideKind";

ALTER TABLE "platform_guide_pages"
  ALTER COLUMN "status" TYPE "PlatformGuideStatus" USING "status"::"PlatformGuideStatus";

ALTER TABLE "platform_guide_pages" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
