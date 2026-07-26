import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { resolveRedisConnection, resolveRedisUrl } from '../redis/redis-connection';

const DEFAULT_TTL_SEC = 60;

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

/**
 * Redis cache with in-memory fallback when Redis is unavailable.
 * Used for youth feed & chat hot paths.
 */
@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis | null = null;
  private readonly memory = new Map<string, MemoryEntry>();
  private redisReady = false;

  constructor() {
    if (process.env.CACHE_ENABLED === 'false') {
      this.logger.log('Cache disabled (CACHE_ENABLED=false)');
      return;
    }
    try {
      const url = resolveRedisUrl();
      const opts = resolveRedisConnection({ maxRetriesPerRequest: 1 });
      this.redis = url
        ? new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true })
        : new Redis({ ...opts, lazyConnect: true });
      this.redis.on('connect', () => {
        this.redisReady = true;
        this.logger.log('Redis cache connected');
      });
      this.redis.on('error', (err) => {
        this.redisReady = false;
        this.logger.warn(`Redis cache error: ${err.message}`);
      });
      void this.redis.connect().catch(() => {
        this.redisReady = false;
      });
    } catch {
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  private pruneMemory() {
    const now = Date.now();
    for (const [k, v] of this.memory) {
      if (v.expiresAt <= now) this.memory.delete(k);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis && this.redisReady) {
      try {
        const raw = await this.redis.get(key);
        if (raw) return JSON.parse(raw) as T;
      } catch {
        /* fallback */
      }
    }
    this.pruneMemory();
    const entry = this.memory.get(key);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SEC): Promise<void> {
    const payload = JSON.stringify(value);
    if (this.redis && this.redisReady) {
      try {
        await this.redis.setex(key, ttlSeconds, payload);
        return;
      } catch {
        /* fallback */
      }
    }
    this.memory.set(key, {
      value: payload,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis && this.redisReady) {
      try {
        await this.redis.del(key);
      } catch {
        /* ignore */
      }
    }
    this.memory.delete(key);
  }

  /** Invalidate keys sharing a prefix (memory scan; Redis SCAN when available). */
  async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of [...this.memory.keys()]) {
      if (key.startsWith(prefix)) this.memory.delete(key);
    }
    if (this.redis && this.redisReady) {
      try {
        let cursor = '0';
        do {
          const [next, keys] = await this.redis.scan(
            cursor,
            'MATCH',
            `${prefix}*`,
            'COUNT',
            50,
          );
          cursor = next;
          if (keys.length) await this.redis.del(...keys);
        } while (cursor !== '0');
      } catch {
        /* ignore */
      }
    }
  }
}
