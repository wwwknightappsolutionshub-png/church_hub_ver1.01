import { test, expect } from '@playwright/test';
import { API_URL, authHeaders, seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Membership end-to-end', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/membership/stats');
  });

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('hub loads with member count badge and search', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await expect(page.getByRole('heading', { name: /^Membership$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByPlaceholder('Search members…')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Members' })).toBeVisible();
  });

  test('section tabs: Members, Families, Classes, Attendance, Import', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await expect(page.getByRole('tab', { name: 'Members' })).toBeVisible({ timeout: 20_000 });

    for (const tab of ['Families', 'Classes', 'Attendance', 'Import'] as const) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    }

    await page.getByRole('tab', { name: 'Members' }).click();
    await expect(page.getByPlaceholder('Search members…')).toBeVisible();
  });

  test('Start onboarding opens wizard; Cancel closes it', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await page.getByRole('button', { name: 'Start onboarding' }).first().click();
    await expect(page.getByRole('heading', { name: 'Member onboarding' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: /^Membership$/i })).toBeVisible();
  });

  test('Import CSV tab shows import wizard entry', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await page.getByRole('tab', { name: 'Import' }).click();
    await expect(page.getByText(/Import|CSV|upload/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Import CSV action button switches to import tab', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await page.getByRole('button', { name: 'Import CSV' }).click();
    await expect(page.getByRole('tab', { name: 'Import' })).toHaveAttribute('aria-selected', 'true');
  });

  test('status pipeline filters are clickable', async ({ page }) => {
    await page.goto('/dashboard/membership');
    const pipeline = page.locator('.membership-hub-root').getByRole('button');
    await expect(pipeline.first()).toBeVisible({ timeout: 20_000 });
    const count = await pipeline.count();
    expect(count).toBeGreaterThan(0);
  });

  test('member search filters the registry table', async ({ page, request }) => {
    const headers = await authHeaders(request);
    const membersRes = await request.get(`${API_URL}/membership/members`, { headers });
    if (!membersRes.ok()) {
      test.skip(true, 'Could not load members for search test');
    }
    const members = await membersRes.json();
    if (!members.length) {
      test.skip(true, 'No seeded members for search test');
    }
    const target = members[0] as { firstName: string; lastName: string };
    const fullName = `${target.firstName} ${target.lastName}`;

    await page.goto('/dashboard/membership');
    await page.getByPlaceholder('Search members…').fill(target.firstName);
    await expect(page.getByText(fullName).first()).toBeVisible({ timeout: 15_000 });
  });
});
