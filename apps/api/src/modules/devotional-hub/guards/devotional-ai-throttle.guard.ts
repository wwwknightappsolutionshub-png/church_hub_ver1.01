import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

/** In-memory rate limit for AI/PDF routes (per user id). Production: use Redis + @nestjs/throttler. */
const buckets = new Map<string, { count: number; resetAt: number }>();

function limits() {
  return {
    windowMs: parseInt(process.env.DEVOTIONAL_AI_RATE_WINDOW_MS ?? '60000', 10),
    max: parseInt(process.env.DEVOTIONAL_AI_RATE_LIMIT ?? '30', 10),
  };
}

@Injectable()
export class DevotionalAiThrottleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { windowMs, max } = limits();
    const req = context.switchToHttp().getRequest<{ user?: { userId?: string }; ip?: string }>();
    const key = req.user?.userId ?? req.ip ?? 'anonymous';
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Devotional AI rate limit exceeded. Try again shortly.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
