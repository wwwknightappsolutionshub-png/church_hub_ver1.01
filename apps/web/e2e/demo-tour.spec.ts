/**
 * Smoke test for the public product tour mockup.
 */
import { test, expect } from '@playwright/test';
import { skipBrowser } from './helpers/auth';

test.describe('Demo product tour', () => {
  test('tour launcher shows signup mock then can skip to dashboard preview', async ({ page }) => {
    test.skip(skipBrowser, 'Browser E2E skipped');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/demo/tour');

    await expect(page.getByTestId('demo-tour-intro')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Create your church workspace')).toBeVisible();

    await page.getByRole('button', { name: 'Skip to dashboard preview' }).click();
    await expect(page.getByTestId('demo-tour-mock-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Leadership')).toBeVisible();
    await expect(page.getByText('Community')).toHaveCount(0);
  });
});
