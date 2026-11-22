import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const prisma = new PrismaClient();
  const outDir = join(__dirname, '../../../docs/qa/pipeline-option-c/phase-2');
  mkdirSync(outDir, { recursive: true });

  const cols = await prisma.$queryRawUnsafe<
    Array<{ table_name: string; column_name: string; data_type: string; udt_name: string }>
  >(`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'follow_ups' AND column_name IN ('stage', 'stageAtAssignment'))
        OR (table_name = 'follow_up_stage_audits' AND column_name IN ('fromStage', 'toStage'))
        OR (table_name = 'pastoral_notes' AND column_name = 'stageAtTime')
        OR (table_name = 'follow_up_automation_rules' AND column_name = 'stage')
      )
    ORDER BY table_name, column_name
  `);

  const enumGone = await prisma.$queryRawUnsafe<Array<{ typname: string }>>(`
    SELECT typname FROM pg_type WHERE typname = 'FollowUpStage'
  `);

  const sample = await prisma.followUp.findMany({
    take: 3,
    select: { id: true, stage: true },
    orderBy: { createdAt: 'desc' },
  });

  const proof = {
    at: new Date().toISOString(),
    cols,
    followUpStageEnumExists: enumGone.length > 0,
    sample,
  };
  writeFileSync(join(outDir, 'db-stage-type.json'), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));

  if (enumGone.length > 0) {
    console.error('FAIL: FollowUpStage enum still exists');
    process.exit(1);
  }
  if (!cols.every((c) => c.data_type === 'text' || c.udt_name === 'text')) {
    console.error('FAIL: expected text columns');
    process.exit(1);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
