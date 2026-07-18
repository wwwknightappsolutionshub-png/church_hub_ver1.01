-- CreateEnum
CREATE TYPE "AuthLinkPurpose" AS ENUM ('PASSWORD_RESET', 'MAGIC_LOGIN');

-- CreateTable
CREATE TABLE "auth_link_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "AuthLinkPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_link_tokens_tokenHash_key" ON "auth_link_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_link_tokens_userId_purpose_idx" ON "auth_link_tokens"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "auth_link_tokens" ADD CONSTRAINT "auth_link_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
