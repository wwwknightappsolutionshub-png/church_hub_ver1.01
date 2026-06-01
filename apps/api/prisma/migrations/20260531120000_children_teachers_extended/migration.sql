-- Children's Church Teachers: duty roster, curriculum library, class reports

CREATE TYPE "ChildrenClassGroup" AS ENUM ('AGES_3_5', 'AGES_6_9', 'AGES_10_12');
CREATE TYPE "ChildrenCurriculumSource" AS ENUM ('OFFICIAL_WEEKLY', 'CUSTOM_UPLOAD');

CREATE TABLE "dept_children_duty_rosters" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "classGroup" "ChildrenClassGroup" NOT NULL,
  "teacherMemberId" TEXT NOT NULL,
  "assistantMemberId" TEXT,
  "notes" TEXT,
  "reminderSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "dept_children_duty_rosters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dept_children_duty_rosters_serviceUnitId_weekStart_classGroup_key"
  ON "dept_children_duty_rosters"("serviceUnitId", "weekStart", "classGroup");
CREATE INDEX "dept_children_duty_rosters_serviceUnitId_weekStart_idx"
  ON "dept_children_duty_rosters"("serviceUnitId", "weekStart");

ALTER TABLE "dept_children_duty_rosters" ADD CONSTRAINT "dept_children_duty_rosters_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_children_duty_rosters" ADD CONSTRAINT "dept_children_duty_rosters_serviceUnitId_fkey"
  FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_children_duty_rosters" ADD CONSTRAINT "dept_children_duty_rosters_teacherMemberId_fkey"
  FOREIGN KEY ("teacherMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_children_duty_rosters" ADD CONSTRAINT "dept_children_duty_rosters_assistantMemberId_fkey"
  FOREIGN KEY ("assistantMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "dept_children_curriculum" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3),
  "title" TEXT NOT NULL,
  "fileUrl" TEXT,
  "body" TEXT,
  "source" "ChildrenCurriculumSource" NOT NULL DEFAULT 'CUSTOM_UPLOAD',
  "targetClassGroup" "ChildrenClassGroup",
  "simplifiedLesson" TEXT,
  "authorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "dept_children_curriculum_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dept_children_curriculum_serviceUnitId_weekStart_idx"
  ON "dept_children_curriculum"("serviceUnitId", "weekStart");
CREATE INDEX "dept_children_curriculum_serviceUnitId_source_idx"
  ON "dept_children_curriculum"("serviceUnitId", "source");

ALTER TABLE "dept_children_curriculum" ADD CONSTRAINT "dept_children_curriculum_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_children_curriculum" ADD CONSTRAINT "dept_children_curriculum_serviceUnitId_fkey"
  FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_children_curriculum" ADD CONSTRAINT "dept_children_curriculum_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "dept_children_class_reports" (
  "id" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "serviceUnitId" TEXT NOT NULL,
  "classGroup" "ChildrenClassGroup" NOT NULL,
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "teacherMemberId" TEXT NOT NULL,
  "curriculumId" TEXT,
  "lessonTaught" TEXT NOT NULL,
  "behaviorNotes" TEXT,
  "attentionNotes" TEXT,
  "escalatePastoralCare" BOOLEAN NOT NULL DEFAULT false,
  "pastoralNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dept_children_class_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dept_children_class_reports_serviceUnitId_serviceDate_idx"
  ON "dept_children_class_reports"("serviceUnitId", "serviceDate");

ALTER TABLE "dept_children_class_reports" ADD CONSTRAINT "dept_children_class_reports_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_children_class_reports" ADD CONSTRAINT "dept_children_class_reports_serviceUnitId_fkey"
  FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_children_class_reports" ADD CONSTRAINT "dept_children_class_reports_teacherMemberId_fkey"
  FOREIGN KEY ("teacherMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dept_children_class_reports" ADD CONSTRAINT "dept_children_class_reports_curriculumId_fkey"
  FOREIGN KEY ("curriculumId") REFERENCES "dept_children_curriculum"("id") ON DELETE SET NULL ON UPDATE CASCADE;
