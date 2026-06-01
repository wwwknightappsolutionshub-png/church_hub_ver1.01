-- Devotional Hub Phase 4 — groups, invites, roles

CREATE TYPE "DevotionalGroupVisibility" AS ENUM ('PRIVATE', 'FRIENDS_ONLY', 'INVITE_LINK');
CREATE TYPE "DevotionalGroupMemberRole" AS ENUM ('ADMIN', 'CO_ADMIN', 'MEMBER');
CREATE TYPE "DevotionalGroupMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED');
CREATE TYPE "DevotionalGroupInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

ALTER TABLE "devotional_groups" ADD COLUMN IF NOT EXISTS "profileImageUrl" TEXT;
ALTER TABLE "devotional_groups" ADD COLUMN IF NOT EXISTS "visibility" "DevotionalGroupVisibility" NOT NULL DEFAULT 'INVITE_LINK';
ALTER TABLE "devotional_groups" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "devotional_groups" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;
ALTER TABLE "devotional_groups" ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "devotional_groups_inviteToken_key" ON "devotional_groups"("inviteToken");
CREATE INDEX IF NOT EXISTS "devotional_groups_churchId_visibility_idx" ON "devotional_groups"("churchId", "visibility");

ALTER TABLE "devotional_groups" ADD CONSTRAINT "devotional_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "devotional_group_members" ADD COLUMN IF NOT EXISTS "status" "DevotionalGroupMemberStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "devotional_group_members" ADD COLUMN IF NOT EXISTS "invitedById" TEXT;
ALTER TABLE "devotional_group_members" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Migrate string roles to enum (existing rows are MEMBER)
ALTER TABLE "devotional_group_members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "devotional_group_members" ALTER COLUMN "role" TYPE "DevotionalGroupMemberRole" USING (
  CASE
    WHEN UPPER("role") IN ('ADMIN') THEN 'ADMIN'::"DevotionalGroupMemberRole"
    WHEN UPPER("role") IN ('CO_ADMIN', 'CO-ADMIN', 'COADMIN') THEN 'CO_ADMIN'::"DevotionalGroupMemberRole"
    ELSE 'MEMBER'::"DevotionalGroupMemberRole"
  END
);
ALTER TABLE "devotional_group_members" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

CREATE INDEX IF NOT EXISTS "devotional_group_members_groupId_status_idx" ON "devotional_group_members"("groupId", "status");

ALTER TABLE "devotional_group_members" ADD CONSTRAINT "devotional_group_members_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "devotional_group_invites" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" "DevotionalGroupInviteStatus" NOT NULL DEFAULT 'PENDING',
    "inviteeEmail" TEXT,
    "inviteePhone" TEXT,
    "inviteeUserEmail" TEXT,
    "invitedMemberId" TEXT,
    "inviteToken" TEXT,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devotional_group_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devotional_group_invites_inviteToken_key" ON "devotional_group_invites"("inviteToken");
CREATE INDEX "devotional_group_invites_groupId_status_idx" ON "devotional_group_invites"("groupId", "status");
CREATE INDEX "devotional_group_invites_invitedMemberId_status_idx" ON "devotional_group_invites"("invitedMemberId", "status");

ALTER TABLE "devotional_group_invites" ADD CONSTRAINT "devotional_group_invites_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_group_invites" ADD CONSTRAINT "devotional_group_invites_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "devotional_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_group_invites" ADD CONSTRAINT "devotional_group_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotional_group_invites" ADD CONSTRAINT "devotional_group_invites_invitedMemberId_fkey" FOREIGN KEY ("invitedMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
