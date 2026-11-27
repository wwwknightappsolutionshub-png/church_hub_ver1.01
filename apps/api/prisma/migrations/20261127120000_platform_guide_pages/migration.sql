-- Public About page and marketing articles. Separate from legal CMS pages.

CREATE TABLE IF NOT EXISTS "platform_guide_pages" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT NOT NULL,
    "coverImagePath" TEXT NOT NULL,
    "coverImageAlt" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "faqs" JSONB NOT NULL,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_guide_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_guide_pages_slug_key" ON "platform_guide_pages"("slug");
CREATE INDEX IF NOT EXISTS "platform_guide_pages_kind_status_showOnHomepage_idx"
  ON "platform_guide_pages"("kind", "status", "showOnHomepage");

DO $$ BEGIN
  ALTER TABLE "platform_guide_pages" ADD CONSTRAINT "platform_guide_pages_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
