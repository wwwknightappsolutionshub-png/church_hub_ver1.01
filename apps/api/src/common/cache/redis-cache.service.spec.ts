import { RedisCacheService } from './redis-cache.service';

describe('RedisCacheService (memory fallback)', () => {
  let cache: RedisCacheService;

  beforeEach(() => {
    process.env.CACHE_ENABLED = 'false';
    cache = new RedisCacheService();
  });

  it('stores and retrieves JSON values', async () => {
    await cache.set('test:key', { ok: true }, 60);
    const value = await cache.get<{ ok: boolean }>('test:key');
    expect(value).toEqual({ ok: true });
  });

  it('returns null for missing keys', async () => {
    expect(await cache.get('missing')).toBeNull();
  });

  it('invalidates by prefix', async () => {
    await cache.set('youth:feed:1:a', { a: 1 }, 60);
    await cache.set('youth:feed:1:b', { b: 2 }, 60);
    await cache.invalidatePrefix('youth:feed:1:');
    expect(await cache.get('youth:feed:1:a')).toBeNull();
    expect(await cache.get('youth:feed:1:b')).toBeNull();
  });
});
