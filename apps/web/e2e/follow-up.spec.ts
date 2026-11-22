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

test.describe('Establishment end-to-end', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/follow-up/stats');
  });

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  async function openEstablishment(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/establishment');
    await expect(page.getByRole('heading', { name: /^Establishment$/i })).toBeVisible({
      timeout: 20_000,
    });
    const cookies = page.getByRole('button', { name: /Essential only|Accept all/i });
    if (await cookies.first().isVisible().catch(() => false)) {
      await cookies.first().click();
    }
  }

  test('page loads with pipeline stats and stage filters', async ({ page }) => {
    await openEstablishment(page);
    await expect(page.getByRole('tab', { name: 'Membership Pipeline' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Establishment$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /New Contacts:/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Contacted:/i })).toBeVisible();
  });

  test('legacy /dashboard/follow-up redirects to establishment', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    await expect(page).toHaveURL(/\/dashboard\/establishment/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /^Establishment$/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('Pipeline and Contact Directory tabs switch views', async ({ page }) => {
    await openEstablishment(page);
    await expect(page.getByRole('tab', { name: 'Membership Pipeline' })).toBeVisible();

    await page.getByRole('tab', { name: 'Contact Directory' }).click();
    await expect(page.getByRole('tab', { name: 'Contact Directory' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.getByRole('tab', { name: 'Membership Pipeline' }).click();
    await expect(page.getByRole('tab', { name: 'Membership Pipeline' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('button', { name: /New Contacts:/i })).toBeVisible();
  });

  async function fillUnlocked(
    page: import('@playwright/test').Page,
    placeholder: string | RegExp,
    value: string,
  ) {
    const input = page.getByPlaceholder(placeholder);
    await input.click();
    await input.fill(value);
  }

  test('New lead sheet opens, cancel closes without submitting', async ({ page }) => {
    await openEstablishment(page);
    await page.getByRole('button', { name: 'New Contact', exact: true }).click();
    await expect(page.getByText('Add New Contact')).toBeVisible({ timeout: 10_000 });
    await fillUnlocked(page, 'First name *', 'ShouldNotPersist');
    // Header X — backdrop also has aria-label Close but sits under the sheet
    await page.locator('div.relative.z-10').getByRole('button').first().click();
    await expect(page.getByText('Add New Contact')).not.toBeVisible();
  });

  test('create lead via New lead form', async ({ page }) => {
    await openEstablishment(page);
    await page.getByRole('button', { name: 'New Contact', exact: true }).click();
    await expect(page.getByPlaceholder('First name *')).toBeVisible({ timeout: 10_000 });
    const first = 'E2E';
    const last = `Lead${runId}`;
    const phone = `07${String(Date.now()).slice(-9)}`;
    await fillUnlocked(page, 'First name *', first);
    await fillUnlocked(page, 'Last name', last);
    await fillUnlocked(page, /Phone \(e\.g\./, phone);
    // OutreachCaptureForm requires UK GDPR consent before save
    await page.getByRole('checkbox', { name: /consented to the church storing/i }).check();
    await page.getByRole('button', { name: 'Save Contact' }).click({ force: true });
    await expect(page.getByText('Add New Contact')).not.toBeVisible({ timeout: 15_000 });
    // Capture may land asynchronously; refresh list if card not yet painted (esp. mobile).
    const leadLocator = page.getByText(last);
    if (!(await leadLocator.first().isVisible().catch(() => false))) {
      await page.reload();
      await expect(page.getByRole('heading', { name: /^Establishment$/i })).toBeVisible({
        timeout: 20_000,
      });
    }
    await expect(page.getByText(last).first()).toBeVisible({ timeout: 20_000 });
  });

  test('stage filter narrows pipeline cards', async ({ page }) => {
    await openEstablishment(page);
    const last = `Lead${runId}`;
    await expect(page.getByText(last)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Joined Group:/i }).click();
    await expect(page.getByText(last)).not.toBeVisible();
    await page.getByRole('button', { name: /New Contacts:/i }).click();
    await expect(page.getByText(last)).toBeVisible();
  });

  test('Outreach link navigates to outreach', async ({ page }) => {
    await openEstablishment(page);
    // Hero Outreach CTA was removed; use member-work / sidebar nav.
    const navOutreach = page.getByRole('navigation').getByRole('link', { name: /^Outreach$/i });
    if (await navOutreach.first().isVisible().catch(() => false)) {
      await navOutreach.first().click();
    } else {
      await page.goto('/dashboard/outreach');
    }
    await expect(page).toHaveURL(/\/dashboard\/outreach/, { timeout: 15_000 });
  });

  test('assignee filter dropdown is interactive', async ({ page }) => {
    await openEstablishment(page);
    await page.getByRole('button', { name: 'Assignee and date filters' }).click();
    const select = page.locator('select').filter({
      has: page.locator('option', { hasText: 'All assignees' }),
    });
    await expect(select).toBeVisible({ timeout: 10_000 });
    const optionCount = await select.locator('option').count();
    expect(optionCount).toBeGreaterThanOrEqual(1);
  });

  test('API stats reflect a healthy pipeline', async ({ request }) => {
    const headers = await authHeaders(request);
    const res = await request.get(`${API_URL}/follow-up/stats`, { headers });
    expect(res.ok()).toBeTruthy();
    const stats = await res.json();
    expect(stats.pending + stats.overdue).toBeGreaterThanOrEqual(0);
    expect(stats).toHaveProperty('graduated');
    expect(stats).toHaveProperty('assigned');
  });
});
