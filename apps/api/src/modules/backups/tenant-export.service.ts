import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import {
  TENANT_EXPORT_COLUMN_REDACT,
  TENANT_EXPORT_TABLE_DENYLIST,
} from './backups.constants';
import { BackupStorageService } from './backup-storage.service';
import { promisify } from 'util';
import { gzip as gzipCb } from 'zlib';

const gzipAsync = promisify(gzipCb);

export type TenantExportResult = {
  storageKey: string;
  fileName: string;
  byteSize: number;
  checksumSha256: string;
  tablesExported: number;
  mediaFilesOk: number;
  mediaFilesFail: number;
  warnings: string[];
  partial: boolean;
  encrypted: boolean;
};

type TableRow = { tableName: string };

@Injectable()
export class TenantExportService {
  private readonly logger = new Logger(TenantExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: BackupStorageService,
  ) {}

  async run(jobId: string, churchId: string): Promise<TenantExportResult> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(churchId)) {
      throw new Error('Invalid churchId');
    }

    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    if (!church) throw new Error('Church not found');

    const tables = await this.listChurchScopedTables();
    const exportData: Record<string, unknown[]> = {};
    const warnings: string[] = [];
    let tablesExported = 0;

    for (const tableName of tables) {
      if (TENANT_EXPORT_TABLE_DENYLIST.has(tableName)) continue;
      try {
        const rows = await this.selectChurchRows(tableName, churchId);
        exportData[tableName] = rows.map((row) => this.redactRow(row));
        tablesExported += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`Skipped table ${tableName}: ${msg}`);
        this.logger.warn(`Tenant export skip ${tableName}: ${msg}`);
      }
    }

    exportData.__church = [church];

    const media = await this.collectMediaHints(exportData);
    const payload = {
      format: 'church-hub-tenant-export-v1',
      exportedAt: new Date().toISOString(),
      churchId,
      church,
      tablesExported,
      warnings,
      media,
      data: exportData,
    };

    const json = Buffer.from(JSON.stringify(payload), 'utf8');
    const compressed = await gzipAsync(json);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeSlug = this.storage.sanitizeFileName(church.slug);
    const plainName = `churchhub-tenant-${safeSlug}-${stamp}.json.gz`;
    const fileName = this.storage.encryptionEnabled() ? `${plainName}.enc` : plainName;
    const storageKey = `tenants/${churchId}/${jobId}/${fileName}`;
    const written = await this.storage.writeBuffer(storageKey, compressed);

    const mediaFilesFail = media.missingCount;
    const mediaFilesOk = media.referencedCount - media.missingCount;
    const partial = warnings.length > 0 || mediaFilesFail > 0;

    return {
      storageKey,
      fileName,
      byteSize: written.byteSize,
      checksumSha256: written.checksumSha256,
      tablesExported,
      mediaFilesOk: Math.max(0, mediaFilesOk),
      mediaFilesFail,
      warnings,
      partial,
      encrypted: written.encrypted,
    };
  }

  /** Exported for unit tests. */
  redactRow(row: unknown): unknown {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      if (TENANT_EXPORT_COLUMN_REDACT.has(key)) {
        out[key] = '[REDACTED]';
        continue;
      }
      out[key] = value;
    }
    return out;
  }

  private async listChurchScopedTables(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<TableRow[]>`
      SELECT c.table_name AS "tableName"
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.column_name = 'churchId'
      ORDER BY c.table_name ASC
    `;
    return rows.map((r) => r.tableName);
  }

  private async selectChurchRows(tableName: string, churchId: string): Promise<unknown[]> {
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('Unsafe table name');
    }
    const quoted = `"${tableName}"`;
    return this.prisma.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM ${quoted} WHERE "churchId" = $1`,
      churchId,
    );
  }

  private async collectMediaHints(exportData: Record<string, unknown[]>): Promise<{
    referencedCount: number;
    missingCount: number;
    urls: string[];
  }> {
    const urls = new Set<string>();
    const urlKeys = /url|avatar|logo|photo|image|file|pdf|audio|recording/i;

    const walk = (value: unknown) => {
      if (value == null) return;
      if (typeof value === 'string') {
        if (/^https?:\/\//i.test(value) || value.startsWith('/api/v1/uploads/')) {
          if (!value.includes('..') && !value.includes('\0')) urls.add(value);
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (urlKeys.test(k) || typeof v === 'object') walk(v);
        }
      }
    };

    walk(exportData);

    return {
      referencedCount: urls.size,
      missingCount: 0,
      urls: Array.from(urls).slice(0, 5000),
    };
  }
}
