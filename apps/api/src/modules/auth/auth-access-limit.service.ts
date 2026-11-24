import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import type { AuthAccessScope } from './auth-access-scope.decorator';

const DEFAULT_IP_MAX_FAILURES = 25;
const DEFAULT_IP_WINDOW_SEC = 15 * 60;
const DEFAULT_IP_LOCK_SEC = 15 * 60;
const DEFAULT_ACCOUNT_LOCK_SEC = 30 * 60;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

@Injectable()
export class AuthAccessLimitService {
  private readonly logger = new Logger(AuthAccessLimitService.name);

  private readonly ipMaxFailures = parsePositiveInt(
    process.env.AUTH_IP_MAX_FAILURES,
    DEFAULT_IP_MAX_FAILURES,
  );
  private readonly ipWindowSec = parsePositiveInt(
    process.env.AUTH_IP_WINDOW_SEC,
    DEFAULT_IP_WINDOW_SEC,
  );
  private readonly ipLockSec = parsePositiveInt(process.env.AUTH_IP_LOCK_SEC, DEFAULT_IP_LOCK_SEC);
  private readonly accountLockSec = parsePositiveInt(
    process.env.AUTH_ACCOUNT_LOCK_SEC,
    DEFAULT_ACCOUNT_LOCK_SEC,
  );

  constructor(private readonly cache: RedisCacheService) {}

  async assertAccessAllowed(
    clientIp: string | null | undefined,
    _scope: AuthAccessScope,
  ): Promise<void> {
    const ip = this.normalizeIp(clientIp);
    await this.assertIpNotLocked(ip);
  }

  async assertAccountNotLocked(emailKey: string): Promise<void> {
    const key = emailKey.trim().toLowerCase();
    if (!key) return;
    const locked = await this.cache.get<{ until: number }>(`auth:account-lock:${key}`);
    if (locked && locked.until > Date.now()) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            'Too many failed sign-in attempts for this account. Try again later or use password reset.',
          code: 'ACCOUNT_LOCKED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async lockAccount(emailKey: string, reason: string): Promise<void> {
    const key = emailKey.trim().toLowerCase();
    if (!key) return;
    const until = Date.now() + this.accountLockSec * 1000;
    await this.cache.set(`auth:account-lock:${key}`, { until, reason }, this.accountLockSec);
    this.logger.warn(`Account lock applied for ${key} (${reason})`);
  }

  async clearAccountLock(emailKey: string): Promise<void> {
    const key = emailKey.trim().toLowerCase();
    if (!key) return;
    await this.cache.del(`auth:account-lock:${key}`);
  }

  async recordFailure(
    clientIp: string | null | undefined,
    scope: AuthAccessScope,
    emailKey?: string,
  ): Promise<void> {
    const ip = this.normalizeIp(clientIp);
    await this.bumpIpFailures(ip, scope);
    if (emailKey) {
      const normalized = emailKey.trim().toLowerCase();
      if (normalized) {
        await this.cache.set(
          `auth:account-last-fail:${normalized}`,
          { at: Date.now(), scope },
          this.accountLockSec,
        );
      }
    }
  }

  async recordSuccess(
    clientIp: string | null | undefined,
    _scope: AuthAccessScope,
    emailKey?: string,
  ): Promise<void> {
    if (emailKey) {
      await this.clearAccountLock(emailKey);
    }
    const ip = this.normalizeIp(clientIp);
    if (ip !== 'unknown') {
      await this.cache.del(`auth:ip-fail:${ip}`);
    }
  }

  private normalizeIp(ip: string | null | undefined): string {
    const v = (ip ?? '').trim();
    return v || 'unknown';
  }

  private async assertIpNotLocked(ip: string): Promise<void> {
    if (ip === 'unknown') return;
    const locked = await this.cache.get<{ until: number }>(`auth:ip-lock:${ip}`);
    if (locked && locked.until > Date.now()) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests from this network. Please wait and try again.',
          code: 'IP_LOCKED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async bumpIpFailures(ip: string, scope: AuthAccessScope): Promise<void> {
    if (ip === 'unknown') return;
    const failKey = `auth:ip-fail:${ip}`;
    const current = (await this.cache.get<number>(failKey)) ?? 0;
    const next = current + 1;
    await this.cache.set(failKey, next, this.ipWindowSec);

    if (next >= this.ipMaxFailures) {
      const until = Date.now() + this.ipLockSec * 1000;
      await this.cache.set(`auth:ip-lock:${ip}`, { until, scope }, this.ipLockSec);
      this.logger.warn(`IP lock applied for ${ip} after ${next} auth failures (${scope})`);
    }
  }
}