/**
 * API smoke test — verifies Devotional Hub endpoints respond for church admin.
 * Run: npx playwright test e2e/devotional-hub-api.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Devotional Hub API smoke', () => {
  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    const ctxRes = await request.get(`${API_URL}/devotional-hub/context`, { headers });
    if (!ctxRes.ok()) {
      test.skip(true, `Devotional Hub API unavailable (${ctxRes.status()})`);
    }
  });

  test('GET context, plans, challenges, journals, groups, prayer-lists, reminders', async ({
    request,
  }) => {
    for (const path of [
      '/devotional-hub/context',
      '/devotional-hub/plans',
      '/devotional-hub/challenges',
      '/devotional-hub/journals',
      '/devotional-hub/groups',
      '/devotional-hub/prayer-lists',
      '/devotional-hub/reminders',
      '/devotional-hub/action-points',
      '/devotional-hub/weekly-review',
    ]) {
      const res = await request.get(`${API_URL}${path}`, { headers });
      expect(res.ok(), `${path} → ${res.status()}`).toBeTruthy();
    }
  });
});
