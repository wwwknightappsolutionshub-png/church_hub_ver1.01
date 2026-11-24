import { createHash, createHmac } from 'crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';

/**
 * Optional S3-compatible off-site uploader (AWS / R2 / B2).
 * Opt-in via BACKUP_OFFSITE_ENABLED=true. Local encrypted storage remains primary.
 */
@Injectable()
export class BackupOffsiteService implements OnModuleInit {
  private readonly logger = new Logger(BackupOffsiteService.name);
  private enabled = false;
  private endpoint = '';
  private bucket = '';
  private accessKey = '';
  private secretKey = '';
  private region = 'us-east-1';
  private lockMode: '' | 'GOVERNANCE' | 'COMPLIANCE' = '';
  private lockDays = 0;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.enabled = ['1', 'true', 'yes', 'on'].includes(
      (this.config.get<string>('BACKUP_OFFSITE_ENABLED') ?? '').toLowerCase(),
    );
    if (!this.enabled) {
      this.logger.log('Backup off-site upload disabled (BACKUP_OFFSITE_ENABLED!=true)');
      return;
    }

    this.endpoint = (this.config.get<string>('S3_ENDPOINT') ?? '').replace(/\/$/, '');
    this.bucket = this.config.get<string>('S3_BUCKET') ?? '';
    this.accessKey = this.config.get<string>('S3_ACCESS_KEY') ?? '';
    this.secretKey = this.config.get<string>('S3_SECRET_KEY') ?? '';
    this.region = this.config.get<string>('S3_REGION') ?? 'us-east-1';
    const mode = (this.config.get<string>('S3_OBJECT_LOCK_MODE') ?? '').toUpperCase();
    this.lockMode = mode === 'GOVERNANCE' || mode === 'COMPLIANCE' ? mode : '';
    this.lockDays = parseInt(this.config.get<string>('S3_OBJECT_LOCK_DAYS') ?? '0', 10) || 0;

    if (!this.endpoint || !this.bucket || !this.accessKey || !this.secretKey) {
      throw new Error(
        'BACKUP_OFFSITE_ENABLED=true requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY',
      );
    }
    this.logger.log(
      `Backup off-site enabled → ${this.endpoint}/${this.bucket} (lock=${this.lockMode || 'off'})`,
    );
  }

  get isEnabled() {
    return this.enabled;
  }

  /** Upload local encrypted artifact bytes to S3-compatible object storage. */
  async uploadArtifact(storageKey: string, absolutePath: string): Promise<{ etag?: string } | null> {
    if (!this.enabled) return null;

    const body = await readFile(absolutePath);
    const key = storageKey.replace(/^\/+/, '');
    const url = new URL(`${this.endpoint}/${this.bucket}/${key}`);
    const amzDate = new Date();
    const dateStamp = amzDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const ymd = dateStamp.slice(0, 8);
    const payloadHash = sha256Hex(body);

    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': dateStamp,
      'content-type': 'application/octet-stream',
      'content-length': String(body.length),
    };

    if (this.lockMode && this.lockDays > 0) {
      const retainUntil = new Date(amzDate.getTime() + this.lockDays * 86_400_000);
      headers['x-amz-object-lock-mode'] = this.lockMode;
      headers['x-amz-object-lock-retain-until-date'] = retainUntil.toISOString();
    }

    const signed = signAwsV4({
      method: 'PUT',
      url,
      headers,
      bodyHash: payloadHash,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      region: this.region,
      service: 's3',
      amzDate: dateStamp,
      dateStamp: ymd,
    });

    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...headers, Authorization: signed },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Off-site backup upload failed (${res.status}): ${text.slice(0, 300)}`);
    }

    return { etag: res.headers.get('etag') ?? undefined };
  }
}

function sha256Hex(data: Buffer | string) {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string) {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function signAwsV4(opts: {
  method: string;
  url: URL;
  headers: Record<string, string>;
  bodyHash: string;
  accessKey: string;
  secretKey: string;
  region: string;
  service: string;
  amzDate: string;
  dateStamp: string;
}) {
  const canonicalHeaders = Object.keys(opts.headers)
    .map((k) => k.toLowerCase())
    .sort()
    .map((k) => `${k}:${opts.headers[k]!.trim()}\n`)
    .join('');
  const signedHeaders = Object.keys(opts.headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(';');

  const canonicalRequest = [
    opts.method,
    opts.url.pathname,
    opts.url.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    opts.bodyHash,
  ].join('\n');

  const credentialScope = `${opts.dateStamp}/${opts.region}/${opts.service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    opts.amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${opts.secretKey}`, opts.dateStamp);
  const kRegion = hmac(kDate, opts.region);
  const kService = hmac(kRegion, opts.service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}
