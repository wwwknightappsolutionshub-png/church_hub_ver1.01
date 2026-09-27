import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { createReadStream } from 'fs';
import { access, chmod, mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { dirname, join, normalize, relative, resolve, sep } from 'path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { BackupCryptoService, downloadFileName, sha256Hex } from './backup-crypto.service';

@Injectable()
export class BackupStorageService implements OnModuleInit {
  private readonly logger = new Logger(BackupStorageService.name);
  private rootDir!: string;
  private hmacSecret!: string;

  constructor(
    private readonly config: ConfigService,
    private readonly crypto: BackupCryptoService,
  ) {}

  async onModuleInit() {
    const configured =
      this.config.get<string>('BACKUP_STORAGE_ROOT')?.trim() ||
      join(process.cwd(), 'storage', 'backups');
    this.rootDir = resolve(configured);
    assertBackupRootNotWebServed(this.rootDir);
    await mkdir(this.rootDir, { recursive: true });
    await chmod(this.rootDir, 0o700).catch(() => {
      /* Windows / unsupported FS — best effort */
    });

    const dedicated = this.config.get<string>('BACKUP_DOWNLOAD_SECRET')?.trim();
    const jwtFallback =
      this.config.get<string>('JWT_SECRET')?.trim() ||
      this.config.get<string>('JWT_ACCESS_SECRET')?.trim();
    const isProd = (this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'production';

    if (dedicated && dedicated.length >= 32) {
      this.hmacSecret = dedicated;
    } else if (!isProd && jwtFallback) {
      this.hmacSecret = jwtFallback;
      this.logger.warn(
        'BACKUP_DOWNLOAD_SECRET missing — using JWT secret for download HMAC (dev only)',
      );
    } else if (!isProd) {
      this.hmacSecret = 'church-hub-backup-dev-only';
      this.logger.warn('Using insecure default backup download secret (dev only)');
    } else {
      throw new Error(
        'BACKUP_DOWNLOAD_SECRET must be set to a strong value (≥32 chars) in production',
      );
    }

    this.logger.log(
      `Backup storage root: ${this.rootDir} (encryption=${this.crypto.enabled ? 'on' : 'off'})`,
    );
  }

  getRootDir() {
    return this.rootDir;
  }

  encryptionEnabled() {
    return this.crypto.enabled;
  }

  absolutePath(storageKey: string): string {
    const key = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!key || key.includes('..') || key.includes('\0')) {
      throw new Error('Invalid storage key');
    }
    const abs = resolve(this.rootDir, ...key.split('/'));
    const rel = relative(this.rootDir, abs);
    if (rel.startsWith('..') || rel === '..' || rel.split(/[/\\]/).includes('..')) {
      throw new Error('Path escapes backup root');
    }
    const rootNorm = normalize(this.rootDir + sep);
    if (!normalize(abs + sep).startsWith(rootNorm) && normalize(abs) !== normalize(this.rootDir)) {
      throw new Error('Path escapes backup root');
    }
    return abs;
  }

  /**
   * Write plaintext; encrypts at rest when BACKUP_ENCRYPTION_KEY is set.
   * checksumSha256 is always over plaintext (logical backup integrity).
   */
  async writeBuffer(
    storageKey: string,
    plaintext: Buffer,
  ): Promise<{ byteSize: number; checksumSha256: string; encrypted: boolean }> {
    const checksumSha256 = sha256Hex(plaintext);
    const toStore = this.crypto.encrypt(plaintext);
    const abs = this.absolutePath(storageKey);
    await mkdir(dirname(abs), { recursive: true, mode: 0o700 });
    await writeFile(abs, toStore, { mode: 0o600 });
    await chmod(dirname(abs), 0o700).catch(() => undefined);
    await chmod(abs, 0o600).catch(() => undefined);
    return {
      byteSize: toStore.length,
      checksumSha256,
      encrypted: this.crypto.enabled,
    };
  }

  async writeStreamFromFile(
    storageKey: string,
    sourcePath: string,
  ): Promise<{ byteSize: number; checksumSha256: string; encrypted: boolean }> {
    const data = await readFile(sourcePath);
    return this.writeBuffer(storageKey, data);
  }

  /** Raw on-disk bytes (may be ciphertext). */
  createRawReadStream(storageKey: string) {
    return createReadStream(this.absolutePath(storageKey));
  }

  /** Plaintext stream for authorized downloads (decrypts envelope when present). */
  openDecryptedReadStream(storageKey: string): Readable {
    const raw = this.createRawReadStream(storageKey);
    return this.crypto.openDecryptedStream(raw);
  }

  async readDecrypted(storageKey: string): Promise<Buffer> {
    const raw = await readFile(this.absolutePath(storageKey));
    return this.crypto.decrypt(raw);
  }

  async fileExists(storageKey: string): Promise<boolean> {
    try {
      await access(this.absolutePath(storageKey));
      return true;
    } catch {
      return false;
    }
  }

  async fileStat(storageKey: string) {
    return stat(this.absolutePath(storageKey));
  }

  async deleteKey(storageKey: string) {
    try {
      await rm(this.absolutePath(storageKey), { force: true });
    } catch {
      /* ignore */
    }
  }

  issueDownloadToken(artifactId: string, expiresAt: Date): string {
    const nonce = randomBytes(16).toString('hex');
    const payload = `${artifactId}.${expiresAt.getTime()}.${nonce}`;
    const sig = createHmac('sha256', this.hmacSecret).update(payload).digest('hex');
    return Buffer.from(`${payload}.${sig}`).toString('base64url');
  }

  verifyDownloadToken(token: string, artifactId: string): boolean {
    try {
      const raw = Buffer.from(token, 'base64url').toString('utf8');
      const parts = raw.split('.');
      if (parts.length !== 4) return false;
      const [id, expStr, nonce, sig] = parts;
      if (id !== artifactId || !nonce || nonce.length < 16) return false;
      const exp = Number(expStr);
      if (!Number.isFinite(exp) || Date.now() > exp) return false;
      const expected = createHmac('sha256', this.hmacSecret)
        .update(`${id}.${expStr}.${nonce}`)
        .digest('hex');
      const a = Buffer.from(sig, 'hex');
      const b = Buffer.from(expected, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  safeEqualHash(a: string, b: string): boolean {
    try {
      const ba = Buffer.from(a, 'hex');
      const bb = Buffer.from(b, 'hex');
      if (ba.length !== bb.length) return false;
      return timingSafeEqual(ba, bb);
    } catch {
      return false;
    }
  }

  randomSuffix(): string {
    return randomBytes(8).toString('hex');
  }

  sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180) || 'backup.bin';
  }

  clientDownloadName(storedFileName: string): string {
    return downloadFileName(storedFileName);
  }
}

/** Reject roots that would be exposed by Nest static uploads or public web dirs. */
export function assertBackupRootNotWebServed(rootDir: string) {
  const cwd = process.cwd();
  const forbidden = [
    join(cwd, 'uploads'),
    join(cwd, 'public'),
    join(cwd, 'apps', 'web', 'public'),
    join(cwd, 'apps', 'api', 'uploads'),
    join(cwd, 'apps', 'web', '.next'),
  ].map((p) => resolve(p));

  const root = resolve(rootDir);
  for (const f of forbidden) {
    if (root === f || root.startsWith(f + sep)) {
      throw new Error(
        `BACKUP_STORAGE_ROOT must not be under a web-served path (${f}). Use e.g. /var/churchhub/backups`,
      );
    }
  }
}
