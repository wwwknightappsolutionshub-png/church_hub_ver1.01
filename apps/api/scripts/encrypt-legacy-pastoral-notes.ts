/**
 * Idempotent batch encrypt of legacy plaintext PastoralNote.content rows.
 *
 * Usage (from apps/api or repo root):
 *   pnpm exec ts-node scripts/encrypt-legacy-pastoral-notes.ts [--dry-run] [--batch=200]
 *
 * Requires DATABASE_URL and PASTORAL_NOTES_KEY (or non-prod fallbacks).
 * Loads repo-root `.env` automatically when those vars are unset.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { isEncryptedSecret } from '../src/common/crypto/secret-box';
import { encryptPastoralNoteContent } from '../src/common/crypto/pastoral-notes.crypto';

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// Prefer monorepo root .env (VPS: /www/wwwroot/.../ChurchApp/.env)
loadEnvFile(resolve(__dirname, '../../../.env'));
loadEnvFile(resolve(__dirname, '../../.env'));

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const batchArg = process.argv.find((a) => a.startsWith('--batch='));
  const batchSize = Math.min(500, Math.max(1, parseInt(batchArg?.split('=')[1] ?? '200', 10) || 200));

  const prisma = new PrismaClient();
  let scanned = 0;
  let encrypted = 0;
  let skipped = 0;

  try {
    for (;;) {
      const rows = await prisma.pastoralNote.findMany({
        select: { id: true, content: true },
        orderBy: { createdAt: 'asc' },
        skip: scanned,
        take: batchSize,
      });
      if (!rows.length) break;

      for (const row of rows) {
        scanned += 1;
        if (!row.content || isEncryptedSecret(row.content)) {
          skipped += 1;
          continue;
        }
        const cipher = encryptPastoralNoteContent(row.content);
        if (dryRun) {
          encrypted += 1;
          continue;
        }
        await prisma.pastoralNote.update({
          where: { id: row.id },
          data: { content: cipher },
        });
        encrypted += 1;
      }

      // eslint-disable-next-line no-console
      console.log(`progress scanned=${scanned} encrypted=${encrypted} skipped=${skipped}`);
      if (rows.length < batchSize) break;
    }

    // eslint-disable-next-line no-console
    console.log(
      `done dryRun=${dryRun} scanned=${scanned} encrypted=${encrypted} skipped=${skipped}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
