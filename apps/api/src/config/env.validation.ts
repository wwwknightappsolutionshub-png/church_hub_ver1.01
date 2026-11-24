import { z } from 'zod';

const boolish = z
  .string()
  .optional()
  .transform((v) => {
    if (v == null || v === '') return undefined;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  });

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32).optional(),
    JWT_ACCESS_EXPIRES_IN: z.string().optional(),
    JWT_REFRESH_EXPIRES_IN: z.string().optional(),
    API_PORT: z.string().optional(),
    CORS_ORIGINS: z.string().optional(),
    INTEGRATION_SECRETS_KEY: z.string().optional(),
    OUTREACH_PII_KEY: z.string().optional(),
    PASTORAL_NOTES_KEY: z.string().optional(),
    BACKUP_ENCRYPTION_KEY: z.string().optional(),
    BACKUP_DOWNLOAD_SECRET: z.string().optional(),
    BACKUP_OFFSITE_ENABLED: boolish,
    BACKUP_SOFT_DELETE_RETENTION_DAYS: z.string().optional(),
    ENABLE_DB_RLS: boolish,
    ENABLE_SOFT_DELETE_PURGE: boolish,
    S3_ENDPOINT: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_OBJECT_LOCK_MODE: z.enum(['GOVERNANCE', 'COMPLIANCE']).optional().or(z.literal('')),
    S3_OBJECT_LOCK_DAYS: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    if (!env.PASTORAL_NOTES_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PASTORAL_NOTES_KEY'],
        message: 'PASTORAL_NOTES_KEY is required in production',
      });
    }

    if (env.BACKUP_OFFSITE_ENABLED) {
      for (const key of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const) {
        if (!env[key]?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when BACKUP_OFFSITE_ENABLED=true`,
          });
        }
      }
    }
  });

export type ValidatedEnv = z.infer<typeof EnvSchema>;

/** Validate process.env at bootstrap. Throws with a readable message on failure. */
export function validateEnv(config: Record<string, unknown> = process.env): ValidatedEnv {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return parsed.data;
}
