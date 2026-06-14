-- CreateTable
CREATE TABLE "dept_children_class_enrollments" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "childMemberId" TEXT NOT NULL,
    "classGroup" "ChildrenClassGroup" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dept_children_class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dept_children_class_enrollments_churchId_classGroup_idx" ON "dept_children_class_enrollments"("churchId", "classGroup");

-- CreateIndex
CREATE UNIQUE INDEX "dept_children_class_enrollments_serviceUnitId_childMemberId_key" ON "dept_children_class_enrollments"("serviceUnitId", "childMemberId");

-- AddForeignKey
ALTER TABLE "dept_children_class_enrollments" ADD CONSTRAINT "dept_children_class_enrollments_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dept_children_class_enrollments" ADD CONSTRAINT "dept_children_class_enrollments_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dept_children_class_enrollments" ADD CONSTRAINT "dept_children_class_enrollments_childMemberId_fkey" FOREIGN KEY ("childMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
