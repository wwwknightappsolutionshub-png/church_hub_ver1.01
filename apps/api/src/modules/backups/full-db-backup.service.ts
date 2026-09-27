import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdir, unlink, rm, chmod } from 'fs/promises';
import { createGzip } from 'zlib';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { BackupStorageService } from './backup-storage.service';

export type FullDbBackupResult = {
  storageKey: string;
  fileName: string;
  byteSize: number;
  checksumSha256: string;
  encrypted: boolean;
};

@Injectable()
export class FullDbBackupService {
  private readonly logger = new Logger(FullDbBackupService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly storage: BackupStorageService,
  ) {}

  async run(jobId: string): Promise<FullDbBackupResult> {
    const databaseUrl = this.config.get<string>('DATABASE_URL')?.trim();
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const plainName = `churchhub-full-${stamp}.sql.gz`;
    const fileName = this.storage.encryptionEnabled() ? `${plainName}.enc` : plainName;
    const storageKey = `full-db/${jobId}/${fileName}`;
    const tmpDir = join(this.storage.getRootDir(), '_tmp', jobId);
    await mkdir(tmpDir, { recursive: true, mode: 0o700 });
    await chmod(tmpDir, 0o700).catch(() => undefined);
    const tmpPath = join(tmpDir, plainName);

    this.logger.log(`Starting database dump for job ${jobId}`);
    try {
      await this.dumpToGzip(databaseUrl, tmpPath);
      const written = await this.storage.writeStreamFromFile(storageKey, tmpPath);
      return {
        storageKey,
        fileName,
        byteSize: written.byteSize,
        checksumSha256: written.checksumSha256,
        encrypted: written.encrypted,
      };
    } finally {
      await unlink(tmpPath).catch(() => undefined);
      await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Run dump using PG* environment variables so the connection string
   * does not appear on the process argv list.
   */
  private dumpToGzip(databaseUrl: string, outPath: string): Promise<void> {
    const pg = parsePostgresUrl(databaseUrl);
    return new Promise((resolve, reject) => {
      const dump = spawn(
        'pg_dump',
        ['--no-owner', '--no-acl', '--clean', '--if-exists'],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PGHOST: pg.host,
            PGPORT: pg.port,
            PGUSER: pg.user,
            PGPASSWORD: pg.password,
            PGDATABASE: pg.database,
            PGSSLMODE: pg.sslMode,
          },
        },
      );
      const gzip = createGzip({ level: 9 });
      const out = createWriteStream(outPath, { mode: 0o600 });
      let stderr = '';
      dump.stderr.on('data', (c: Buffer) => {
        stderr += c.toString('utf8');
      });
      dump.on('error', (err) => {
        reject(
          new Error(
            `Database dump failed to start (${err.message}). Ensure PostgreSQL client tools are installed on the host.`,
          ),
        );
      });
      pipeline(dump.stdout!, gzip, out)
        .then(() => {
          if (dump.exitCode && dump.exitCode !== 0) {
            reject(new Error(`Database dump exited ${dump.exitCode}: ${stderr.slice(0, 2000)}`));
            return;
          }
          resolve();
        })
        .catch(reject);
      dump.on('close', (code) => {
        if (code && code !== 0 && !out.destroyed) {
          reject(new Error(`Database dump exited ${code}: ${stderr.slice(0, 2000)}`));
        }
      });
    });
  }
}

export function parsePostgresUrl(databaseUrl: string): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  sslMode: string;
} {
  let normalized = databaseUrl;
  if (normalized.startsWith('postgresql://')) {
    /* ok */
  } else if (normalized.startsWith('postgres://')) {
    normalized = 'postgresql://' + normalized.slice('postgres://'.length);
  } else {
    throw new Error('DATABASE_URL must be a postgres connection URL');
  }

  const u = new URL(normalized);
  const database = decodeURIComponent(u.pathname.replace(/^\//, '').split('/')[0] || '');
  if (!database) throw new Error('DATABASE_URL missing database name');

  const sslMode =
    u.searchParams.get('sslmode') ||
    (process.env.NODE_ENV === 'production' ? 'prefer' : 'prefer');

  return {
    host: u.hostname || 'localhost',
    port: u.port || '5432',
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
    database,
    sslMode,
  };
}
