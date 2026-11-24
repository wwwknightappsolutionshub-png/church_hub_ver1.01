import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createHash, randomBytes } from 'crypto';
import { createGzip } from 'zlib';
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { pipeline } from 'stream/promises';
import { Readable, PassThrough } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { runWithTenantBypassAsync } from '../../prisma/tenant-context';
import { SecurityAuditService } from '../../common/security/security-audit.service';
import { BackupOffsiteService } from './backup-offsite.service';

/**
 * Opt-in cold archive of SecurityAuditLog rows older than hot retention.
 * AUDIT_ARCHIVE_ENABLED=false by default.
 * Prunes only after verified S3 upload (HEAD size check).
 * Requires BACKUP_ENCRYPTION_KEY (no JWT fallback).
 */
@Injectable()
export class AuditArchiveScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditArchiveScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
    private readonly offsite: BackupOffsiteService,
  ) {}

  onModuleInit() {
    const enabled = ['1', 'true', 'yes', 'on'].includes(
      (this.config.get<string>('AUDIT_ARCHIVE_ENABLED') ?? '').toLowerCase(),
    );
    if (!enabled) {
      this.logger.log('Audit archive scheduler disabled (AUDIT_ARCHIVE_ENABLED!=true)');
      return;
    }
    const key = this.config.get<string>('BACKUP_ENCRYPTION_KEY')?.trim();
    if (!key) {
      throw new Error(
        'AUDIT_ARCHIVE_ENABLED=true requires BACKUP_ENCRYPTION_KEY (JWT_ACCESS_SECRET must not be used for archive encryption)',
      );
    }
    // Daily check; archiveOnce no-ops until min interval since last completion.
    this.timer = setInterval(() => {
      void this.archiveOnce().catch((err) =>
        this.logger.warn(`Audit archive failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 24 * 60 * 60_000);
    this.logger.log('Audit archive scheduler started (daily check, monthly interval gate)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async archiveOnce() {
    if (!this.offsite.isEnabled) {
      this.logger.warn('AUDIT_ARCHIVE_ENABLED requires BACKUP_OFFSITE_ENABLED with S3 configured');
      return { archived: 0 };
    }

    const encKey = this.config.get<string>('BACKUP_ENCRYPTION_KEY')?.trim();
    if (!encKey) {
      throw new Error('BACKUP_ENCRYPTION_KEY required for audit archive');
    }

    const minIntervalDays = parseInt(
      this.config.get<string>('AUDIT_ARCHIVE_MIN_INTERVAL_DAYS') ?? '28',
      10,
    );
    const last = await runWithTenantBypassAsync(() =>
      this.prisma.securityAuditLog.findFirst({
        where: { action: 'AUDIT_ARCHIVE_COMPLETED' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    );
    if (last) {
      const elapsedMs = Date.now() - last.createdAt.getTime();
      const minMs = Math.max(1, minIntervalDays) * 86_400_000;
      if (elapsedMs < minMs) {
        this.logger.debug(
          `Audit archive skipped — last run ${Math.round(elapsedMs / 86_400_000)}d ago (min ${minIntervalDays}d)`,
        );
        return { archived: 0, skipped: true };
      }
    }

    const days = parseInt(this.config.get<string>('AUDIT_HOT_RETENTION_DAYS') ?? '365', 10);
    const cutoff = new Date(Date.now() - Math.max(30, days) * 86_400_000);
    const batchSize = 2000;

    return runWithTenantBypassAsync(async () => {
      const rows = await this.prisma.securityAuditLog.findMany({
        where: {
          createdAt: { lt: cutoff },
          // Never re-archive / delete the completion markers themselves in this batch
          // by excluding very recent system actions is unnecessary; they're new.
          action: { not: 'AUDIT_ARCHIVE_COMPLETED' },
        },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
      });
      if (!rows.length) return { archived: 0 };

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storageKey = `backups/audit-archives/audit-${stamp}.jsonl.gz.enc`;
      const dir = join(tmpdir(), 'churchhub-audit-archive');
      await mkdir(dir, { recursive: true });
      const tmpPath = join(dir, `audit-${stamp}.jsonl.gz.enc`);

      const safeRows = rows.map((r) => ({
        id: r.id,
        churchId: r.churchId,
        actorId: r.actorId,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        ip: r.ip,
        createdAt: r.createdAt.toISOString(),
        metadata: this.audit.sanitizeMetadata(r.metadata as never),
      }));
      const jsonl = safeRows.map((r) => JSON.stringify(r)).join('\n');
      const compressed = await gzipBuffer(Buffer.from(jsonl, 'utf8'));
      const encrypted = encryptAesGcm(compressed, encKey);
      await writeFile(tmpPath, encrypted);
      const localSize = (await stat(tmpPath)).size;

      let upload: { etag?: string } | null = null;
      try {
        upload = await this.offsite.uploadArtifact(storageKey, tmpPath);
        const verified = await this.offsite.verifyArtifact(storageKey, localSize);
        if (!verified.ok) {
          throw new Error(
            `Archive upload verification failed for ${storageKey}: ${verified.reason}`,
          );
        }
      } finally {
        await unlink(tmpPath).catch(() => undefined);
      }

      const ids = rows.map((r) => r.id);
      await this.prisma.securityAuditLog.deleteMany({ where: { id: { in: ids } } });

      await this.audit.append({
        churchId: null,
        actorId: null,
        action: 'AUDIT_ARCHIVE_COMPLETED',
        targetType: 'AuditLog',
        metadata: {
          storageKey,
          rowCount: rows.length,
          cutoff: cutoff.toISOString(),
          etag: upload?.etag ?? null,
          bytes: localSize,
        },
      });

      this.logger.log(`Archived ${rows.length} audit rows → ${storageKey}`);
      return { archived: rows.length };
    });
  }
}

async function gzipBuffer(buf: Buffer): Promise<Buffer> {
  const gzip = createGzip({ level: 9 });
  const chunks: Buffer[] = [];
  const sink = new PassThrough();
  sink.on('data', (c: Buffer) => chunks.push(c));
  await pipeline(Readable.from(buf), gzip, sink);
  return Buffer.concat(chunks);
}

function encryptAesGcm(plaintext: Buffer, keyMaterial: string): Buffer {
  const key = createHash('sha256').update(keyMaterial.trim()).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('v1'), iv, tag, enc]);
}
