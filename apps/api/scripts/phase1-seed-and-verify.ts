import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ensureWinnersDefaultPipelineTemplate } from '../src/modules/follow-up/pipeline-template.seed';

async function main() {
  const prisma = new PrismaClient();
  const outDir = join(__dirname, '../../../docs/qa/pipeline-option-c/phase-1');
  mkdirSync(outDir, { recursive: true });

  const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE 'pipeline_%'
    ORDER BY c.relname
  `);

  const migration = await prisma.$queryRawUnsafe<
    Array<{ migration_name: string; finished_at: Date | null }>
  >(`
    SELECT migration_name, finished_at
    FROM _prisma_migrations
    WHERE migration_name LIKE '%pipeline_option_c_phase1%'
  `);

  if (!tables.length) {
    console.error('FAIL: pipeline_* tables missing');
    process.exit(1);
  }

  const seeded = await ensureWinnersDefaultPipelineTemplate(prisma);
  const stages = await prisma.pipelineTemplateStage.findMany({
    where: { templateId: seeded.id },
    orderBy: { sortOrder: 'asc' },
    select: {
      key: true,
      label: true,
      isEntry: true,
      blocksArchive: true,
      graduatesSla: true,
      phaseKey: true,
    },
  });

  const proof = { at: new Date().toISOString(), tables, migration, seeded, stages };
  writeFileSync(join(outDir, 'db-seed-verify.json'), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));

  if (seeded.stageCount !== 6) {
    console.error('FAIL: expected 6 stages, got', seeded.stageCount);
    process.exit(1);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
