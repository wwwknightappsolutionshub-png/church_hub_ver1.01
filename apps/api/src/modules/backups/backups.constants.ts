export const BACKUPS_QUEUE = 'church-hub-backups';

export type BackupQueueJob = {
  jobId: string;
};

/** Tables that must never appear in tenant exports (platform / backup meta / auth secrets). */
export const TENANT_EXPORT_TABLE_DENYLIST = new Set([
  'backup_jobs',
  'backup_artifacts',
  'backup_schedules',
  'backup_requests',
  'platform_broadcasts',
  'platform_broadcast_deliveries',
  'platform_email_templates',
  'platform_marketing_drips',
  'platform_cms_pages',
  'platform_whatsapp_config',
  'platform_marketing_submissions',
  'platform_dsar_requests',
  'refresh_tokens',
  'auth_link_tokens',
  'push_subscriptions',
  'permissions',
  'roles',
  'user_roles',
  '_prisma_migrations',
]);

/**
 * Column names (camelCase as stored by Prisma) stripped from every exported row.
 * Prevents credential / secret leakage in tenant packages.
 */
export const TENANT_EXPORT_COLUMN_REDACT = new Set([
  'passwordHash',
  'password_hash',
  'apiKeyEncrypted',
  'api_key_encrypted',
  'refreshToken',
  'refresh_token',
  'tokenHash',
  'token_hash',
  'downloadTokenHash',
  'download_token_hash',
  'secret',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'stripeSecret',
  'stripe_secret',
  'webhookSecret',
  'webhook_secret',
]);

export const BACKUP_DOWNLOAD_TTL_MS = 10 * 60 * 1000;

/** Max tenant backup requests per church per rolling 24h. */
export const TENANT_BACKUP_REQUEST_MAX_PER_DAY = 3;
