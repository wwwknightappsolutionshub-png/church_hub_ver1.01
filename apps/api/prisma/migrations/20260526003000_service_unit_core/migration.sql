-- Core service unit tables (missing from init; required before service_unit_access)

CREATE TABLE "service_units" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activities" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_unit_members" (
    "id" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_unit_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_unit_members_serviceUnitId_memberId_key" ON "service_unit_members"("serviceUnitId", "memberId");

CREATE TABLE "service_unit_leaders" (
    "id" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'LEADER',
    "isModerator" BOOLEAN NOT NULL DEFAULT true,
    "isUnitAdmin" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_unit_leaders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_unit_leaders_serviceUnitId_memberId_key" ON "service_unit_leaders"("serviceUnitId", "memberId");

CREATE TABLE "service_unit_meetings" (
    "id" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_unit_meetings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_unit_meetings_serviceUnitId_startsAt_idx" ON "service_unit_meetings"("serviceUnitId", "startsAt");

CREATE TABLE "service_unit_posts" (
    "id" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_unit_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_unit_posts_serviceUnitId_createdAt_idx" ON "service_unit_posts"("serviceUnitId", "createdAt");

CREATE TABLE "service_unit_post_replies" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_unit_post_replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_unit_presence" (
    "id" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_unit_presence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_unit_presence_serviceUnitId_memberId_key" ON "service_unit_presence"("serviceUnitId", "memberId");

ALTER TABLE "service_units" ADD CONSTRAINT "service_units_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_unit_members" ADD CONSTRAINT "service_unit_members_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_members" ADD CONSTRAINT "service_unit_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_unit_leaders" ADD CONSTRAINT "service_unit_leaders_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_leaders" ADD CONSTRAINT "service_unit_leaders_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_unit_meetings" ADD CONSTRAINT "service_unit_meetings_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_meetings" ADD CONSTRAINT "service_unit_meetings_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_unit_posts" ADD CONSTRAINT "service_unit_posts_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_posts" ADD CONSTRAINT "service_unit_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_unit_post_replies" ADD CONSTRAINT "service_unit_post_replies_postId_fkey" FOREIGN KEY ("postId") REFERENCES "service_unit_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_post_replies" ADD CONSTRAINT "service_unit_post_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_unit_presence" ADD CONSTRAINT "service_unit_presence_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_presence" ADD CONSTRAINT "service_unit_presence_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
