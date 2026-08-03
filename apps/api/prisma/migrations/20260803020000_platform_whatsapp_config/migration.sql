-- Platform-wide WhatsApp gateway config (singleton).

CREATE TABLE IF NOT EXISTS "platform_whatsapp_config" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiUrl" TEXT,
    "apiKeyEncrypted" TEXT,
    "sessionId" TEXT,
    "apiKeyHeader" TEXT NOT NULL DEFAULT 'x-api-key',
    "lastTestAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT,
    "lastSendAt" TIMESTAMP(3),
    "lastSendOk" BOOLEAN,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_whatsapp_config_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "platform_whatsapp_config" ADD CONSTRAINT "platform_whatsapp_config_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "platform_whatsapp_config" ("id", "enabled", "apiKeyHeader", "createdAt", "updatedAt")
VALUES ('global', false, 'x-api-key', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
