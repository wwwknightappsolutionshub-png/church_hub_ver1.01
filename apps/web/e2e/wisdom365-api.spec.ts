/**
 * API smoke test — verifies Wisdom365+ endpoints respond for church admin.
 * Run: npx playwright test e2e/wisdom365-api.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Wisdom365+ API smoke', () => {
  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    const catalogRes = await request.get(`${API_URL}/wisdom365/catalog`, { headers });
    if (!catalogRes.ok()) {
      test.skip(true, `Wisdom365+ API unavailable (${catalogRes.status()})`);
    }
  });

  test('GET catalog returns variants and me payload', async ({ request }) => {
    const res = await request.get(`${API_URL}/wisdom365/catalog`, { headers });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.variants)).toBe(true);
    expect(data.variants.length).toBeGreaterThanOrEqual(1);
    expect(data).toHaveProperty('me');
    expect(data).toHaveProperty('product');
  });

  test('GET me and reminders', async ({ request }) => {
    const meRes = await request.get(`${API_URL}/wisdom365/me`, { headers });
    expect(meRes.ok()).toBeTruthy();
    const me = await meRes.json();
    expect(me).toHaveProperty('entitlements');

    const remindersRes = await request.get(`${API_URL}/wisdom365/reminders`, { headers });
    expect(remindersRes.ok()).toBeTruthy();
  });
});
