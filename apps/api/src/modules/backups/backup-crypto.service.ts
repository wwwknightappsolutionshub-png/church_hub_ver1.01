import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transform, Readable } from 'stream';

/** On-disk envelope: MAGIC(4) | IV(12) | ciphertext | authTag(16) */
export const BACKUP_ENC_MAGIC = Buffer.from('CHB1');

@Injectable()
export class BackupCryptoService implements OnModuleInit {
  private readonly logger = new Logger(BackupCryptoService.name);
  private key: Buffer | null = null;
  private initError: Error | null = null;

  constructor(private readonly config: ConfigService) {
    this.loadKey();
  }

  private loadKey() {
    const raw = this.config.get<string>('BACKUP_ENCRYPTION_KEY')?.trim();
    const isProd = (this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'production';

    if (raw) {
      try {
        this.key = parseEncryptionKey(raw);
      } catch (err) {
        this.initError = err instanceof Error ? err : new Error(String(err));
      }
      return;
    }

    if (isProd) {
      this.initError = new Error(
        'BACKUP_ENCRYPTION_KEY must be set in production (32-byte key as 64 hex chars or base64)',
      );
    }
  }

  async onModuleInit() {
    if (this.initError) throw this.initError;
    if (this.key) {
      this.logger.log('Backup at-rest encryption enabled (AES-256-GCM)');
    } else {
      this.logger.warn(
        'BACKUP_ENCRYPTION_KEY missing — backup artifacts stored unencrypted (dev only)',
      );
    }
  }

  get enabled(): boolean {
    return this.key != null;
  }

  /** Encrypt plaintext for storage. No-op if encryption disabled. */
  encrypt(plaintext: Buffer): Buffer {
    if (!this.key) return plaintext;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([BACKUP_ENC_MAGIC, iv, encrypted, tag]);
  }

  /**
   * Decrypt storage blob. Legacy (no magic) plaintext is returned unchanged.
   * Throws if magic present but key missing or auth fails.
   */
  decrypt(blob: Buffer): Buffer {
    if (!isEncryptedBlob(blob)) return blob;
    if (!this.key) {
      throw new Error('Encrypted backup requires BACKUP_ENCRYPTION_KEY');
    }
    const iv = blob.subarray(4, 16);
    const tag = blob.subarray(blob.length - 16);
    const ciphertext = blob.subarray(16, blob.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /** Stream transform: buffer all chunks then decrypt (artifacts are finite files). */
  createDecryptTransform(): Transform {
    const chunks: Buffer[] = [];
    const decrypt = (blob: Buffer) => this.decrypt(blob);
    return new Transform({
      transform(chunk, _enc, cb) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      },
      flush(cb) {
        try {
          const plain = decrypt(Buffer.concat(chunks));
          this.push(plain);
          cb();
        } catch (err) {
          cb(err as Error);
        }
      },
    });
  }

  openDecryptedStream(source: Readable): Readable {
    if (!this.enabled) return source;
    return source.pipe(this.createDecryptTransform());
  }
}

export function isEncryptedBlob(blob: Buffer): boolean {
  if (blob.length < 4 + 12 + 16) return false;
  return timingSafeEqual(blob.subarray(0, 4), BACKUP_ENC_MAGIC);
}

export function parseEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  try {
    const b64 = Buffer.from(trimmed, 'base64');
    if (b64.length === 32) return b64;
  } catch {
    /* fall through */
  }
  // Accept raw 32-byte utf8 only if exactly 32 chars (dev convenience)
  if (Buffer.byteLength(trimmed, 'utf8') === 32) {
    return Buffer.from(trimmed, 'utf8');
  }
  throw new Error(
    'BACKUP_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64-encoded)',
  );
}

export function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Strip trailing .enc for user-facing download names. */
export function downloadFileName(storedName: string): string {
  return storedName.endsWith('.enc') ? storedName.slice(0, -4) : storedName;
}
