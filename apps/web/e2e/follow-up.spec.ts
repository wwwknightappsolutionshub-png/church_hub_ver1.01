import { test, expect } from '@playwright/test';
import {
  API_URL,
  authHeaders,
  seedAuth,
  skipBrowser,
  skipUnlessApiOk,
} from './helpers/auth';

const runId = Date.now().toString(36);
const leadName = `E2E Lead ${runId}`;

test.describe.configure({ mode: 'serial' });

test.describe('Outreach end-to-end', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/follow-up/stats');
  });

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('page loads with pipeline stats and search', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    await expect(page.getByRole('heading', { name: /^Outreach$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByPlaceholder('Search name, phone, email, assignee…')).toBeVisible();
    await expect(page.getByText('Active').first()).toBeVisible();
  });

  test('Pipeline and Members tabs switch views', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    await expect(page.getByRole('button', { name: 'Pipeline' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Members' }).click();
    await expect(page.getByRole('button', { name: 'Members' })).toHaveClass(/bg-slate-900|dark:bg-slate-100/);

    await page.getByRole('button', { name: 'Pipeline' }).click();
    await expect(page.getByPlaceholder('Search name, phone, email, assignee…')).toBeVisible();
  });

  test('New lead sheet opens, cancel closes without submitting', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    await page.getByRole('button', { name: 'New Contact' }).click();
    await expect(page.getByPlaceholder('Full name *')).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder('Full name *').fill('Should not persist');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByPlaceholder('Full name *')).not.toBeVisible();
  });

  test('create lead via New lead form', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    await page.getByRole('button', { name: 'New Contact' }).click();
    await page.getByPlaceholder('Full name *').fill(leadName);
    await page.getByRole('textbox', { name: 'Phone', exact: true }).fill('555-0100');
    await page.getByRole('button', { name: 'Add to pipeline' }).click();
    await expect(page.getByText(leadName)).toBeVisible({ timeout: 15_000 });
  });

  test('search filters pipeline cards', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    await expect(page.getByText(leadName)).toBeVisible({ timeout: 20_000 });
    const search = page.getByPlaceholder('Search name, phone, email, assignee…');
    await search.fill('zzz-no-match-zzz');
    await expect(page.getByText(leadName)).not.toBeVisible();
    await search.fill(leadName);
    await expect(page.getByText(leadName)).toBeVisible();
  });

  test('Outreach Capture link navigates to outreach', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    await page.getByRole('link', { name: /Outreach Capture/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/outreach/, { timeout: 15_000 });
  });

  test('assignee filter dropdown is interactive', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'All assignees' }) });
    await expect(select).toBeVisible({ timeout: 20_000 });
    const optionCount = await select.locator('option').count();
    expect(optionCount).toBeGreaterThanOrEqual(1);
  });

  test('API stats reflect a healthy pipeline', async ({ request }) => {
    const headers = await authHeaders(request);
    const res = await request.get(`${API_URL}/follow-up/stats`, { headers });
    expect(res.ok()).toBeTruthy();
    const stats = await res.json();
    expect(stats).toHaveProperty('pending');
    expect(stats).toHaveProperty('byStage');
  });
});
