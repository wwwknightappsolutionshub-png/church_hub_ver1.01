/**
 * Phase 5 — permanent redirect + shell regression for Establishment / Outreach split.
 */
import { test, expect } from '@playwright/test';
import { seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';

test.describe('Establishment / Outreach redirects', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/follow-up/stats');
  });

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  async function dismissCookies(page: import('@playwright/test').Page) {
    const cookies = page.getByRole('button', { name: /Essential only|Accept all/i });
    if (await cookies.first().isVisible().catch(() => false)) {
      await cookies.first().click();
    }
  }

  test('/dashboard/follow-up permanently lands on /dashboard/establishment', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    await expect(page).toHaveURL(/\/dashboard\/establishment\/?$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /^Establishment$/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('manager chrome shows Membership Pipeline tab, not Field Outreach label', async ({
    page,
  }) => {
    await page.goto('/dashboard/establishment');
    await expect(page.getByRole('heading', { name: /^Establishment$/i })).toBeVisible({
      timeout: 20_000,
    });
    await dismissCookies(page);
    await expect(page.getByRole('tab', { name: 'Membership Pipeline' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Contact Directory' })).toBeVisible();
    await expect(page.getByText('Field Outreach')).toHaveCount(0);
  });

  test('Outreach page title is Outreach and links to Establishment', async ({ page }) => {
    await page.goto('/dashboard/outreach');
    await expect(page.getByRole('heading', { name: /^Outreach$/i })).toBeVisible({
      timeout: 20_000,
    });
    await dismissCookies(page);
    const establishmentCta = page.getByRole('main').getByRole('link', { name: /^Establishment$/i });
    await expect(establishmentCta).toBeVisible();
    await establishmentCta.click();
    await expect(page).toHaveURL(/\/dashboard\/establishment/, { timeout: 15_000 });
  });
});
