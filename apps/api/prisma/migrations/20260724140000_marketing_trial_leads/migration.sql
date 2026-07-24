-- SaaS marketing trial leads (exit-intent / timed modal on /)
CREATE TABLE IF NOT EXISTS "marketing_trial_leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailKey" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_trial_leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_trial_leads_tokenHash_key" ON "marketing_trial_leads"("tokenHash");
CREATE INDEX IF NOT EXISTS "marketing_trial_leads_emailKey_idx" ON "marketing_trial_leads"("emailKey");
