import { test, expect } from '@playwright/test';
import { DEVOTIONAL_HUB_TABS } from '../lib/devotional-hub';
import { seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Devotional Hub', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/devotional-hub/context');
  });

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('hub route loads with heading', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await expect(page.getByRole('heading', { name: /Devotional Hub/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('tablist includes Today and Challenges', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    const tablist = page.getByRole('tablist', { name: 'Devotional sections' });
    await expect(tablist.getByRole('tab', { name: 'Today' })).toBeVisible({ timeout: 20_000 });
    await expect(tablist.getByRole('tab', { name: 'Challenges' })).toBeVisible();
  });

  test('all hub tabs are navigable', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    const tablist = page.getByRole('tablist', { name: 'Devotional sections' });
    await expect(tablist).toBeVisible({ timeout: 20_000 });

    for (const { label } of DEVOTIONAL_HUB_TABS) {
      await tablist.getByRole('tab', { name: label }).click();
      await expect(tablist.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('Plans tab shows plan list or create entry', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await page.getByRole('tab', { name: 'Plans' }).click();
    const createPlan = page.getByRole('link', { name: 'Create plan' });
    const planCard = page.locator('[class*="Card"]').first();
    await expect(createPlan.or(planCard)).toBeVisible({ timeout: 15_000 });
  });

  test('Today tab shows devotional content or empty state', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await page.getByRole('tab', { name: 'Today' }).click();
    const panel = page.locator('#devotional-panel-today');
    await expect(
      panel
        .getByRole('button', { name: 'Mark today complete' })
        .or(panel.getByText(/No active plan|Select a plan/i))
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Study & AI tab loads tools panel', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await page.getByRole('tab', { name: 'Study & AI' }).click();
    await expect(page.getByText(/Study outline|Scripture|AI/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Challenges tab loads challenge panel', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await page.getByRole('tab', { name: 'Challenges' }).click();
    await expect(page.getByText(/Challenge|Weekly|badge/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
