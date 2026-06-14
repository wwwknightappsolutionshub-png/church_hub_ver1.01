import { test, expect } from '@playwright/test';
import { API_URL, authHeaders, seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Congregants end-to-end', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/membership/stats');
  });

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('overview loads with Congregants heading and KPI cards', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await expect(page.getByRole('heading', { name: /^Congregants$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('congregants-feature-nav')).toBeVisible();
    await expect(page.getByTestId('stat-card-members')).toBeVisible();
    await expect(page.getByPlaceholder('Search members…')).not.toBeVisible();
  });

  test('feature nav: Members, Families List, Communications', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await expect(page.getByTestId('congregants-nav-members')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('congregants-nav-members').click();
    await expect(page).toHaveURL(/\/dashboard\/membership\/members/);
    await expect(page.getByTestId('congregant-list')).toBeVisible();
    await expect(page.getByTestId('congregant-pagination')).toBeVisible();

    await page.getByTestId('congregants-nav-families').click();
    await expect(page).toHaveURL(/\/dashboard\/membership\/families/);
    await expect(page.getByTestId('families-add-button')).toBeVisible();

    await page.getByTestId('congregants-nav-communications').click();
    await expect(page).toHaveURL(/\/dashboard\/membership\/communications/);
    await expect(page.getByTestId('comm-wysiwyg')).toBeVisible();
  });

  test('Import CSV page loads from overview action', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await page.getByRole('link', { name: 'Import CSV' }).click();
    await expect(page).toHaveURL(/\/dashboard\/membership\/import/);
    await expect(page.getByText(/Import|CSV|upload/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('status pipeline filters link to members list', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await expect(page.getByTestId('status-pipeline')).toBeVisible({ timeout: 20_000 });
    const pipeline = page.getByTestId('status-pipeline').getByRole('button');
    await expect(pipeline.first()).toBeVisible();
    await pipeline.first().click();
    await expect(page).toHaveURL(/\/dashboard\/membership\/members/);
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

    await page.goto('/dashboard/membership/members');
    await page.getByPlaceholder('Search members…').fill(target.firstName);
    await expect(page.getByText(fullName).first()).toBeVisible({ timeout: 15_000 });
  });
});
