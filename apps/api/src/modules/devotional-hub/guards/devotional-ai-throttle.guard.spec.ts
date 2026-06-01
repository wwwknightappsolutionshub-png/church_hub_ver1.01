import { ExecutionContext, HttpException } from '@nestjs/common';
import { DevotionalAiThrottleGuard } from './devotional-ai-throttle.guard';

function mockContext(userId?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: userId ? { userId } : undefined, ip: '127.0.0.1' }),
    }),
  } as ExecutionContext;
}

describe('DevotionalAiThrottleGuard', () => {
  const prevLimit = process.env.DEVOTIONAL_AI_RATE_LIMIT;
  const prevWindow = process.env.DEVOTIONAL_AI_RATE_WINDOW_MS;

  beforeAll(() => {
    process.env.DEVOTIONAL_AI_RATE_LIMIT = '2';
    process.env.DEVOTIONAL_AI_RATE_WINDOW_MS = '60000';
  });

  afterAll(() => {
    process.env.DEVOTIONAL_AI_RATE_LIMIT = prevLimit;
    process.env.DEVOTIONAL_AI_RATE_WINDOW_MS = prevWindow;
  });

  it('allows requests under the limit', () => {
    const guard = new DevotionalAiThrottleGuard();
    const ctx = mockContext('user-a');
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('blocks when limit exceeded', () => {
    const guard = new DevotionalAiThrottleGuard();
    const ctx = mockContext('user-b');
    guard.canActivate(ctx);
    guard.canActivate(ctx);
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });
});
