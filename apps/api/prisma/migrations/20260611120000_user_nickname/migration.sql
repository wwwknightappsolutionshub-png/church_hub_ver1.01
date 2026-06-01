-- User display nickname for community hubs and settings
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
