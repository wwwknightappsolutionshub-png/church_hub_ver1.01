-- CreateEnum
CREATE TYPE "DeptUnitFeedbackAuthorRole" AS ENUM ('PASTOR', 'ADMIN', 'UNIT_LEADER');

-- CreateTable
CREATE TABLE "dept_unit_feedbacks" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "parentId" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorMemberId" TEXT,
    "authorRole" "DeptUnitFeedbackAuthorRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dept_unit_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dept_unit_feedbacks_serviceUnitId_createdAt_idx" ON "dept_unit_feedbacks"("serviceUnitId", "createdAt");

-- CreateIndex
CREATE INDEX "dept_unit_feedbacks_parentId_idx" ON "dept_unit_feedbacks"("parentId");

-- AddForeignKey
ALTER TABLE "dept_unit_feedbacks" ADD CONSTRAINT "dept_unit_feedbacks_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dept_unit_feedbacks" ADD CONSTRAINT "dept_unit_feedbacks_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dept_unit_feedbacks" ADD CONSTRAINT "dept_unit_feedbacks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "dept_unit_feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dept_unit_feedbacks" ADD CONSTRAINT "dept_unit_feedbacks_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dept_unit_feedbacks" ADD CONSTRAINT "dept_unit_feedbacks_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
