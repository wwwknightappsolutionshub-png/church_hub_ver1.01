import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const outDir = join(repoRoot, 'docs', 'qa', 'pipeline-option-c', 'phase-0');
mkdirSync(outDir, { recursive: true });

const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(`
  SELECT e.enumlabel AS stage
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  WHERE t.typname = 'FollowUpStage'
  ORDER BY e.enumsortorder
`);

const text = JSON.stringify(rows, null, 2);
console.log(text);
writeFileSync(join(outDir, 'db-enum.json'), text);
writeFileSync(join(outDir, 'db-enum.log'), `${new Date().toISOString()}\n${text}\n`);
await prisma.$disconnect();
