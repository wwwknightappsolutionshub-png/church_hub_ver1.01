import {
  TENANT_EXPORT_COLUMN_REDACT,
  TENANT_EXPORT_TABLE_DENYLIST,
  TENANT_BACKUP_REQUEST_MAX_PER_DAY,
  BACKUP_DOWNLOAD_TTL_MS,
} from './backups.constants';
import { ALL_PLATFORM_PERMISSION_KEYS } from '../platform/platform-permissions.catalog';
import { TenantExportService } from './tenant-export.service';

describe('backup security constants', () => {
  it('denies platform and meta tables from tenant exports', () => {
    expect(TENANT_EXPORT_TABLE_DENYLIST.has('backup_jobs')).toBe(true);
    expect(TENANT_EXPORT_TABLE_DENYLIST.has('platform_cms_pages')).toBe(true);
    expect(TENANT_EXPORT_TABLE_DENYLIST.has('roles')).toBe(true);
    expect(TENANT_EXPORT_TABLE_DENYLIST.has('refresh_tokens')).toBe(true);
    expect(TENANT_EXPORT_TABLE_DENYLIST.has('auth_link_tokens')).toBe(true);
    expect(TENANT_EXPORT_TABLE_DENYLIST.has('user_roles')).toBe(true);
  });

  it('redacts credential columns from tenant exports', () => {
    expect(TENANT_EXPORT_COLUMN_REDACT.has('passwordHash')).toBe(true);
    expect(TENANT_EXPORT_COLUMN_REDACT.has('apiKeyEncrypted')).toBe(true);
    expect(TENANT_EXPORT_COLUMN_REDACT.has('downloadTokenHash')).toBe(true);
    expect(TENANT_EXPORT_COLUMN_REDACT.has('webhookSecret')).toBe(true);
  });

  it('keeps download TTL short and rate-limits tenant requests', () => {
    expect(BACKUP_DOWNLOAD_TTL_MS).toBeLessThanOrEqual(15 * 60 * 1000);
    expect(TENANT_BACKUP_REQUEST_MAX_PER_DAY).toBeLessThanOrEqual(5);
  });

  it('registers platform backup permissions', () => {
    expect(ALL_PLATFORM_PERMISSION_KEYS).toEqual(
      expect.arrayContaining([
        'platform.backups:read',
        'platform.backups:write',
        'platform.backups:download',
      ]),
    );
  });
});

describe('TenantExportService.redactRow', () => {
  const svc = Object.create(TenantExportService.prototype) as TenantExportService;

  it('strips password hashes and secrets', () => {
    const out = svc.redactRow({
      id: '1',
      email: 'a@b.c',
      passwordHash: '$2b$10$secret',
      apiKeyEncrypted: 'enc',
      name: 'Ada',
    }) as Record<string, unknown>;
    expect(out.passwordHash).toBe('[REDACTED]');
    expect(out.apiKeyEncrypted).toBe('[REDACTED]');
    expect(out.email).toBe('a@b.c');
    expect(out.name).toBe('Ada');
  });
});
