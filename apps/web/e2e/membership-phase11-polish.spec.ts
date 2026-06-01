import { test, expect } from '@playwright/test';

const skip = process.env.SKIP_PLAYWRIGHT === 'true' || process.env.SKIP_E2E === 'true';

test.describe('Phase 11 polish', () => {
  test.skip(skip, 'Set SKIP_PLAYWRIGHT=true to skip');

  test('offline page renders', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: /offline/i })).toBeVisible();
  });

  test('manifest meets install criteria', async ({ request }) => {
    const res = await request.get('/manifest.json');
    const m = await res.json();
    expect(m.display).toBe('standalone');
    expect(m.icons?.length).toBeGreaterThan(0);
  });

  test('service worker file is v2', async ({ request }) => {
    const res = await request.get('/sw.js');
    const text = await res.text();
    expect(text).toContain('church-hub-static-v2');
    expect(text).toContain('/offline');
  });
});
