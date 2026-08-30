/**
 * Smoke test for the public product tour entry and dashboard overlay.
 */
import { test, expect } from '@playwright/test';
import { skipBrowser } from './helpers/auth';

test.describe('Demo product tour', () => {
  test('tour launcher shows intro then reaches dashboard overlay', async ({ page }) => {
    test.skip(skipBrowser, 'Browser E2E skipped');
    test.skip(
      !process.env.PLAYWRIGHT_API_URL && !process.env.CI,
      'Requires API for demo login',
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/demo/tour');

    await expect(page.getByText('Create your church workspace')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Skip to dashboard tour' }).click();

    await expect(page).toHaveURL(/\/dashboard(\?tour=1)?/, { timeout: 30000 });
    await expect(page.getByTestId('demo-tour-overlay')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Leadership/)).toBeVisible();
  });
});
