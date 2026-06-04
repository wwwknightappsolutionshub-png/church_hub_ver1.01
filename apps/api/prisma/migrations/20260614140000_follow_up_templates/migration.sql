-- follow_up_templates (in schema + seed; missing from phase4_pastoral_followup)

CREATE TABLE "follow_up_templates" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "follow_up_templates_churchId_channel_idx" ON "follow_up_templates"("churchId", "channel");

ALTER TABLE "follow_up_templates" ADD CONSTRAINT "follow_up_templates_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
