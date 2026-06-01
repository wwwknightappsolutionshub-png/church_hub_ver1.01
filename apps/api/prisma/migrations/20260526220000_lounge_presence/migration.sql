CREATE TABLE "lounge_presence" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "lounge_presence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lounge_presence_churchId_memberId_key" ON "lounge_presence"("churchId", "memberId");
CREATE INDEX "lounge_presence_churchId_isOnline_idx" ON "lounge_presence"("churchId", "isOnline");

ALTER TABLE "lounge_presence" ADD CONSTRAINT "lounge_presence_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lounge_presence" ADD CONSTRAINT "lounge_presence_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
