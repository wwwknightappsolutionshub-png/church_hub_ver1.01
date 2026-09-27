import { createHmac, randomBytes } from 'crypto';
import { BackupStorageService, assertBackupRootNotWebServed } from './backup-storage.service';
import { BackupCryptoService } from './backup-crypto.service';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';

async function makeStorage(opts: {
  root: string;
  encryptionKey?: string;
  nodeEnv?: string;
}) {
  const config = {
    get: (key: string) => {
      if (key === 'BACKUP_STORAGE_ROOT') return opts.root;
      if (key === 'BACKUP_DOWNLOAD_SECRET') return 'test-backup-download-secret-32chars!!';
      if (key === 'BACKUP_ENCRYPTION_KEY') return opts.encryptionKey;
      if (key === 'NODE_ENV') return opts.nodeEnv ?? 'test';
      return undefined;
    },
  } as ConfigService;
  const crypto = new BackupCryptoService(config);
  await crypto.onModuleInit();
  const storage = new BackupStorageService(config, crypto);
  await storage.onModuleInit();
  return { storage, crypto };
}

describe('BackupStorageService path safety', () => {
  let root: string;
  let storage: BackupStorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ch-backup-'));
    ({ storage } = await makeStorage({
      root,
      encryptionKey: 'a'.repeat(64),
    }));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('rejects path traversal in storage keys', () => {
    expect(() => storage.absolutePath('../etc/passwd')).toThrow(/Invalid|escapes/i);
    expect(() => storage.absolutePath('a/../../b')).toThrow(/Invalid|escapes/i);
  });

  it('writes encrypted blobs and decrypts on read', async () => {
    const key = 'tenants/demo/job1/file.json.gz.enc';
    const plain = Buffer.from('hello-backup');
    const result = await storage.writeBuffer(key, plain);
    expect(result.encrypted).toBe(true);
    expect(result.checksumSha256).toHaveLength(64);
    expect(await storage.fileExists(key)).toBe(true);
    const roundTrip = await storage.readDecrypted(key);
    expect(roundTrip.equals(plain)).toBe(true);
  });

  it('issues and verifies download tokens with nonce', () => {
    const expires = new Date(Date.now() + 60_000);
    const token = storage.issueDownloadToken('artifact-1', expires);
    expect(storage.verifyDownloadToken(token, 'artifact-1')).toBe(true);
    expect(storage.verifyDownloadToken(token, 'other')).toBe(false);
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    expect(raw.split('.').length).toBe(4);
  });

  it('rejects forged tokens', () => {
    const expires = new Date(Date.now() + 60_000);
    const nonce = randomBytes(16).toString('hex');
    const payload = `artifact-1.${expires.getTime()}.${nonce}`;
    const bad = Buffer.from(
      `${payload}.${createHmac('sha256', 'wrong-secret-not-matching!!!!').update(payload).digest('hex')}`,
    ).toString('base64url');
    expect(storage.verifyDownloadToken(bad, 'artifact-1')).toBe(false);
  });

  it('rejects expired tokens', () => {
    const expires = new Date(Date.now() - 1000);
    const token = storage.issueDownloadToken('artifact-1', expires);
    expect(storage.verifyDownloadToken(token, 'artifact-1')).toBe(false);
  });

  it('compares hashes in constant time', () => {
    const a = storage.hashToken('alpha');
    const b = storage.hashToken('alpha');
    const c = storage.hashToken('beta');
    expect(storage.safeEqualHash(a, b)).toBe(true);
    expect(storage.safeEqualHash(a, c)).toBe(false);
  });

  it('sanitizes download file names', () => {
    expect(storage.sanitizeFileName('../evil\r\nName.sql')).toMatch(/^[\w.-]+$/);
    expect(storage.clientDownloadName('x.sql.gz.enc')).toBe('x.sql.gz');
  });
});

describe('assertBackupRootNotWebServed', () => {
  it('rejects uploads directory', () => {
    expect(() => assertBackupRootNotWebServed(join(process.cwd(), 'uploads'))).toThrow(
      /web-served/i,
    );
  });
});

describe('BackupStorageService production secret', () => {
  it('refuses to boot in production without a strong BACKUP_DOWNLOAD_SECRET', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ch-backup-prod-'));
    const config = {
      get: (key: string) => {
        if (key === 'BACKUP_STORAGE_ROOT') return root;
        if (key === 'BACKUP_ENCRYPTION_KEY') return 'b'.repeat(64);
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      },
    } as ConfigService;
    const crypto = new BackupCryptoService(config);
    await crypto.onModuleInit();
    const storage = new BackupStorageService(config, crypto);
    await expect(storage.onModuleInit()).rejects.toThrow(/BACKUP_DOWNLOAD_SECRET/);
    await rm(root, { recursive: true, force: true });
  });
});
