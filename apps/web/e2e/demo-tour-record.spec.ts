/**
 * Records a walkthrough of the demo product tour for marketing fallback assets.
 * Run: npx playwright test e2e/demo-tour-record.spec.ts --project=chromium
 *
 * Requires API + seed. Outputs screenshots to apps/web/public/demo/tour/
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { seedAuth, skipBrowser } from './helpers/auth';
import { buildDemoAdminLeadershipNav } from '../lib/demo-tour';

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'demo', 'tour');

test.describe('Demo tour capture', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  test('capture leadership nav screenshots', async ({ page, request }) => {
    test.skip(skipBrowser, 'Browser E2E skipped');

    await seedAuth(page, request);
    await page.setViewportSize({ width: 1440, height: 900 });

    const nav = buildDemoAdminLeadershipNav();

    for (const [index, item] of nav.entries()) {
      await page.goto(item.href);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      const slug = item.href.replace(/^\/dashboard\/?/, '') || 'home';
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${String(index + 1).padStart(2, '0')}-${slug}.png`),
        fullPage: false,
      });
    }

    await page.goto('/demo/tour');
    await expect(page.getByText('Create your church workspace')).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '00-intro-register.png'),
      fullPage: true,
    });
  });
});
