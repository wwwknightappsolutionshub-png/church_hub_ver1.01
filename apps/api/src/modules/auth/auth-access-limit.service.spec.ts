import { HttpException } from '@nestjs/common';
import { AuthAccessLimitService } from './auth-access-limit.service';

describe('AuthAccessLimitService', () => {
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
  let service: AuthAccessLimitService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthAccessLimitService(cache as never);
  });

  it('blocks when IP lock is active', async () => {
    cache.get.mockImplementation(async (key: string) => {
      if (key === 'auth:ip-lock:1.2.3.4') return { until: Date.now() + 60_000 };
      return null;
    });
    await expect(service.assertAccessAllowed('1.2.3.4', 'login')).rejects.toBeInstanceOf(HttpException);
  });

  it('locks IP after repeated failures', async () => {
    let failures = 0;
    cache.get.mockImplementation(async (key: string) => {
      if (key === 'auth:ip-fail:9.9.9.9') return failures;
      return null;
    });
    cache.set.mockImplementation(async (key: string, value: unknown) => {
      if (key === 'auth:ip-fail:9.9.9.9' && typeof value === 'number') failures = value;
    });
    for (let i = 0; i < 25; i++) {
      await service.recordFailure('9.9.9.9', 'login');
    }
    expect(cache.set).toHaveBeenCalledWith(
      'auth:ip-lock:9.9.9.9',
      expect.objectContaining({ scope: 'login' }),
      expect.any(Number),
    );
  });
});