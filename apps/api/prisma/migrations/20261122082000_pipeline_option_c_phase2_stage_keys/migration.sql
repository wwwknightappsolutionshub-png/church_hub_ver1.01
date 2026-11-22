-- Option C Phase 2: FollowUp stage columns become string keys (validated via resolved pipeline)

-- follow_ups.stage
ALTER TABLE "follow_ups" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "follow_ups" ALTER COLUMN "stage" TYPE TEXT USING ("stage"::text);
ALTER TABLE "follow_ups" ALTER COLUMN "stage" SET DEFAULT 'NEW_LEAD';

-- follow_ups.stageAtAssignment
ALTER TABLE "follow_ups" ALTER COLUMN "stageAtAssignment" TYPE TEXT USING ("stageAtAssignment"::text);

-- follow_up_stage_audits
ALTER TABLE "follow_up_stage_audits" ALTER COLUMN "fromStage" TYPE TEXT USING ("fromStage"::text);
ALTER TABLE "follow_up_stage_audits" ALTER COLUMN "toStage" TYPE TEXT USING ("toStage"::text);

-- pastoral_notes
ALTER TABLE "pastoral_notes" ALTER COLUMN "stageAtTime" TYPE TEXT USING ("stageAtTime"::text);

-- follow_up_automation_rules
ALTER TABLE "follow_up_automation_rules" ALTER COLUMN "stage" TYPE TEXT USING ("stage"::text);

-- Drop Prisma enum type (no remaining dependents)
DROP TYPE IF EXISTS "FollowUpStage";
