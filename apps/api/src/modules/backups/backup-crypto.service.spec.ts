import { BackupCryptoService, isEncryptedBlob, parseEncryptionKey } from './backup-crypto.service';
import { ConfigService } from '@nestjs/config';
import { parsePostgresUrl } from './full-db-backup.service';

describe('BackupCryptoService', () => {
  it('round-trips AES-GCM with hex key', async () => {
    const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const config = {
      get: (k: string) => (k === 'BACKUP_ENCRYPTION_KEY' ? key : k === 'NODE_ENV' ? 'test' : undefined),
    } as ConfigService;
    const crypto = new BackupCryptoService(config);
    await crypto.onModuleInit();
    expect(crypto.enabled).toBe(true);
    const plain = Buffer.from('sensitive-dump-bytes');
    const enc = crypto.encrypt(plain);
    expect(isEncryptedBlob(enc)).toBe(true);
    expect(enc.equals(plain)).toBe(false);
    expect(crypto.decrypt(enc).equals(plain)).toBe(true);
  });

  it('passes through legacy plaintext', async () => {
    const key = 'c'.repeat(64);
    const config = {
      get: (k: string) => (k === 'BACKUP_ENCRYPTION_KEY' ? key : 'test'),
    } as ConfigService;
    const crypto = new BackupCryptoService(config);
    await crypto.onModuleInit();
    const legacy = Buffer.from('not-encrypted');
    expect(crypto.decrypt(legacy).equals(legacy)).toBe(true);
  });

  it('requires encryption key in production', async () => {
    const config = {
      get: (k: string) => (k === 'NODE_ENV' ? 'production' : undefined),
    } as ConfigService;
    const crypto = new BackupCryptoService(config);
    await expect(crypto.onModuleInit()).rejects.toThrow(/BACKUP_ENCRYPTION_KEY/);
  });

  it('parses hex and base64 keys', () => {
    const hex = 'd'.repeat(64);
    expect(parseEncryptionKey(hex)).toHaveLength(32);
    const b64 = Buffer.alloc(32, 7).toString('base64');
    expect(parseEncryptionKey(b64)).toHaveLength(32);
  });
});

describe('parsePostgresUrl', () => {
  it('extracts connection fields without exposing URL as argv input', () => {
    const parsed = parsePostgresUrl(
      'postgresql://myuser:s%40cret@db.example:5433/churchhub?sslmode=require',
    );
    expect(parsed).toEqual({
      host: 'db.example',
      port: '5433',
      user: 'myuser',
      password: 's@cret',
      database: 'churchhub',
      sslMode: 'require',
    });
  });
});
