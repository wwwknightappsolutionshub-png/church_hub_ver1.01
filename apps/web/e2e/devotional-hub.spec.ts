import { test, expect, type Page } from '@playwright/test';
import { DEVOTIONAL_HUB_TABS, type DevotionalHubTabId } from '../lib/devotional-hub';
import { seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

const LG_BREAKPOINT = 1024;

function usesMobileTabSelect(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < LG_BREAKPOINT;
}

async function selectDevotionalTab(
  page: Page,
  tabId: DevotionalHubTabId,
  label: string,
): Promise<void> {
  if (usesMobileTabSelect(page)) {
    await page.getByTestId('devotional-hub-tab-select').selectOption(tabId);
    return;
  }
  await page.getByRole('tab', { name: label }).click();
}

async function expectDevotionalTabSelected(
  page: Page,
  tabId: DevotionalHubTabId,
  label: string,
): Promise<void> {
  if (usesMobileTabSelect(page)) {
    await expect(page.getByTestId('devotional-hub-tab-select')).toHaveValue(tabId);
    return;
  }
  await expect(page.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
}

async function waitForDevotionalTabNav(page: Page): Promise<void> {
  if (usesMobileTabSelect(page)) {
    await expect(page.getByTestId('devotional-hub-tab-select')).toBeVisible({ timeout: 20_000 });
    return;
  }
  await expect(page.getByRole('tablist', { name: 'Devotional sections' })).toBeVisible({
    timeout: 20_000,
  });
}

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

  test('tab navigation includes Today and Challenges', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await waitForDevotionalTabNav(page);

    if (usesMobileTabSelect(page)) {
      const labels = await page.getByTestId('devotional-hub-tab-select').locator('option').allTextContents();
      expect(labels).toContain('Today');
      expect(labels).toContain('Challenges');
      return;
    }

    const tablist = page.getByRole('tablist', { name: 'Devotional sections' });
    await expect(tablist.getByRole('tab', { name: 'Today' })).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'Challenges' })).toBeVisible();
  });

  test('all hub tabs are navigable', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await waitForDevotionalTabNav(page);

    for (const { id, label } of DEVOTIONAL_HUB_TABS) {
      await selectDevotionalTab(page, id, label);
      await expectDevotionalTabSelected(page, id, label);
    }
  });

  test('Plans tab shows plan list or create entry', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await selectDevotionalTab(page, 'plans', 'Plans');
    const createPlan = page.getByRole('link', { name: 'Create plan' });
    const planCard = page.locator('[class*="Card"]').first();
    await expect(createPlan.or(planCard)).toBeVisible({ timeout: 15_000 });
  });

  test('Today tab shows devotional content or empty state', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await selectDevotionalTab(page, 'today', 'Today');
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
    await selectDevotionalTab(page, 'study', 'Study & AI');
    await expect(page.getByText(/Study outline|Scripture|AI/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Challenges tab loads challenge panel', async ({ page }) => {
    await page.goto('/dashboard/devotional-hub');
    await selectDevotionalTab(page, 'challenges', 'Challenges');
    await expect(page.getByText(/Challenge|Weekly|badge/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('deep-linked challenges tab is selected on load', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard/devotional-hub?tab=challenges');
    await expectDevotionalTabSelected(page, 'challenges', 'Challenges');
    await expect(page.getByTestId('devotional-hub-tab-description')).toContainText('Challenges');
  });

  test('mobile uses section select for all tabs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/devotional-hub');
    const select = page.getByTestId('devotional-hub-tab-select');
    await expect(select).toBeVisible({ timeout: 15_000 });
    await select.selectOption('challenges');
    await expect(select).toHaveValue('challenges');
    await expect(page.getByTestId('devotional-hub-tab-description')).toContainText('Challenges');
  });
});
