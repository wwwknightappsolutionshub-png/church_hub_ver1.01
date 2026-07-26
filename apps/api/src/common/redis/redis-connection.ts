/**
 * Shared Redis connection options for BullMQ + ioredis cache.
 * Prefer REDIS_URL (may include password); otherwise host/port + REDIS_PASSWORD.
 */
export type RedisConnectionOptions = {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: number | null;
};

function passwordFromRedisUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.password ? decodeURIComponent(parsed.password) : undefined;
  } catch {
    return undefined;
  }
}

export function resolveRedisConnection(
  overrides?: Partial<Pick<RedisConnectionOptions, 'maxRetriesPerRequest'>>,
): RedisConnectionOptions {
  const url = process.env.REDIS_URL?.trim();
  const host =
    process.env.REDIS_HOST?.trim() ||
    (url
      ? (() => {
          try {
            return new URL(url).hostname || '127.0.0.1';
          } catch {
            return '127.0.0.1';
          }
        })()
      : '127.0.0.1');
  const port = parseInt(
    process.env.REDIS_PORT?.trim() ||
      (url
        ? (() => {
            try {
              const p = new URL(url).port;
              return p || '6379';
            } catch {
              return '6379';
            }
          })()
        : '6379'),
    10,
  );
  const password =
    process.env.REDIS_PASSWORD?.trim() ||
    (url ? passwordFromRedisUrl(url) : undefined) ||
    undefined;

  return {
    host,
    port,
    ...(password ? { password } : {}),
    maxRetriesPerRequest: overrides?.maxRetriesPerRequest ?? 1,
  };
}

/** Full URL for ioredis when REDIS_URL is set; otherwise undefined (use options). */
export function resolveRedisUrl(): string | undefined {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return undefined;
  const password = process.env.REDIS_PASSWORD?.trim();
  if (!password) return url;
  try {
    const parsed = new URL(url);
    if (parsed.password) return url;
    parsed.password = password;
    return parsed.toString();
  } catch {
    return url;
  }
}
