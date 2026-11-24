/**
 * Verifies a local backup artifact can be decrypted and is non-empty.
 *
 * Usage:
 *   pnpm exec ts-node scripts/verify-backup-restore.ts <storageKey>
 */
import { join } from 'path';
import { readFile } from 'fs/promises';
import { BackupCryptoService } from '../src/modules/backups/backup-crypto.service';
import { ConfigService } from '@nestjs/config';

async function main() {
  const key = process.argv[2];
  if (!key) {
    throw new Error('Usage: ts-node scripts/verify-backup-restore.ts <storageKey>');
  }
  const root =
    process.env.BACKUP_STORAGE_ROOT?.trim() || join(process.cwd(), 'storage', 'backups');
  const abs = join(root, ...key.replace(/\\/g, '/').split('/'));
  const config = {
    get: (k: string) => process.env[k],
  } as ConfigService;
  const crypto = new BackupCryptoService(config);
  await crypto.onModuleInit();
  const raw = await readFile(abs);
  const plain = crypto.decrypt(raw);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      ok: plain.length > 0,
      storageKey: key,
      plaintextBytes: plain.length,
      encryptedOnDisk: crypto.enabled,
    }),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
