-- Platform-wide public site measurement IDs (singleton).

CREATE TABLE IF NOT EXISTS "platform_site_tracking" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "gtmContainerId" TEXT,
    "gaMeasurementId" TEXT,
    "facebookPixelId" TEXT,
    "googleSiteVerification" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_site_tracking_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "platform_site_tracking" ADD CONSTRAINT "platform_site_tracking_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "platform_site_tracking" (
    "id",
    "gtmContainerId",
    "gaMeasurementId",
    "createdAt",
    "updatedAt"
)
VALUES (
    'global',
    'GTM-WXVNRGZ8',
    'G-LRQXN7591Q',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
