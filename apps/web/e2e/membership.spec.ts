import { test, expect } from '@playwright/test';
import { seedAuth, skipBrowser } from './helpers/auth';

test.describe('Congregants end-to-end', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('hub redirects to members list with nav', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await expect(page).toHaveURL(/\/dashboard\/membership\/members/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /^Congregants$/i })).toBeVisible();
    await expect(page.getByTestId('congregants-feature-nav')).toBeVisible();
    await expect(page.getByTestId('congregant-list')).toBeVisible();
  });

  test('feature nav: Members, Families List, Communications', async ({ page }) => {
    await page.goto('/dashboard/membership/members');
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

  test('Import CSV page loads from nav tab', async ({ page }) => {
    await page.goto('/dashboard/membership/members');
    await page.getByTestId('congregants-nav-import').click();
    await expect(page).toHaveURL(/\/dashboard\/membership\/import/);
    await expect(page.getByText(/Import|CSV|upload/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('member search filters the registry table', async ({ page, request }) => {
    const { API_URL, authHeaders } = await import('./helpers/auth');
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
