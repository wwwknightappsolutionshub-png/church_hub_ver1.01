/**
 * Phase 3 — Establishment UI binds to GET /follow-up/pipeline.
 * Run: npx playwright test e2e/pipeline-option-c-phase3-ui.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';
import { resetPipelineOptionCDemo } from './helpers/pipeline-option-c';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 3 — UI bind', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/follow-up/pipeline');
    const headers = await assertLogin(request);
    await resetPipelineOptionCDemo(request, headers);
  });

  test('resolve API still returns winners_default stages for UI', async ({ request }) => {
    const headers = await assertLogin(request);
    const res = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.source).toBe('template');
    expect(body.stages.map((s: { key: string }) => s.key)).toContain('NEW_LEAD');
    expect(body.phases).toHaveLength(3);
  });

  test('Establishment stage filters render from resolved pipeline', async ({ page, request }) => {
    await seedAuth(page, request);
    await page.goto('/dashboard/establishment');
    await expect(page.getByRole('heading', { name: /^Establishment$/i })).toBeVisible({
      timeout: 20_000,
    });
    const cookies = page.getByRole('button', { name: /Essential only|Accept all/i });
    if (await cookies.first().isVisible().catch(() => false)) {
      await cookies.first().click();
    }

    const filters = page.getByTestId('pipeline-stage-filters');
    await expect(filters).toBeVisible({ timeout: 15_000 });
    await expect(filters).toHaveAttribute('data-pipeline-source', 'template');

    await expect(filters.getByRole('button', { name: /New Contacts:/i })).toBeVisible();
    await expect(filters.getByRole('button', { name: /Contacted:/i })).toBeVisible();
    await expect(filters.getByRole('button', { name: /Attended Service:/i })).toBeVisible();
    await expect(filters.getByRole('button', { name: /Joined Group:/i })).toBeVisible();

    const newContacts = filters.getByRole('button', { name: /New Contacts:/i });
    const cls = (await newContacts.getAttribute('class')) ?? '';
    expect(cls.includes('border') && cls.includes('bg-')).toBeTruthy();
  });

  test('Membership Pipeline phase strip uses resolved phases', async ({ page, request }) => {
    await seedAuth(page, request);
    await page.goto('/dashboard/establishment');
    await expect(page.getByRole('tab', { name: 'Membership Pipeline' })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('tab', { name: 'Membership Pipeline' }).click();

    const strip = page.getByTestId('pipeline-phase-strip');
    await expect(strip).toBeVisible({ timeout: 15_000 });
    await expect(strip.getByText(/Initial Outreach/i)).toBeVisible();
    await expect(strip.getByText(/Growing Engagement/i)).toBeVisible();
    await expect(strip.getByText(/Belonging & Discipleship/i)).toBeVisible();

    await expect(page.locator('[data-pipeline-source="template"]').first()).toBeVisible();
  });
});
