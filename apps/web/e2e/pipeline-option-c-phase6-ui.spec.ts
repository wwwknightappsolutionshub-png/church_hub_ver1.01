/**
 * Phase 6 — switch template (non-forked) → Establishment tabs change; then fork.
 * Run: npx playwright test e2e/pipeline-option-c-phase6-ui.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';
import { resetPipelineOptionCDemo } from './helpers/pipeline-option-c';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 6 — template picker UI', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/follow-up/pipeline');
    const headers = await assertLogin(request);
    await resetPipelineOptionCDemo(request, headers);
  });

  test('Settings picker selects simple_visitor and Establishment tabs shrink', async ({
    page,
    request,
  }) => {
    await seedAuth(page, request);
    await page.goto('/dashboard/settings/membership-pipeline');
    await expect(page.getByRole('heading', { name: /Membership Pipeline/i })).toBeVisible({
      timeout: 20_000,
    });
    const cookies = page.getByRole('button', { name: /Essential only|Accept all/i });
    if (await cookies.first().isVisible().catch(() => false)) {
      await cookies.first().click();
    }

    const picker = page.getByTestId('pipeline-template-picker');
    await expect(picker).toBeVisible({ timeout: 15_000 });
    await picker.locator('[data-template-key="simple_visitor"]').click();
    await expect(page.getByTestId('pipeline-active-template-key')).toHaveText('simple_visitor', {
      timeout: 10_000,
    });

    // Stage list should not include Engrafted / Baptism keys on settings preview
    const panel = page.getByTestId('membership-pipeline-settings');
    await expect(panel.locator('[data-stage-key="NEW_LEAD"]')).toBeVisible();
    await expect(panel.locator('[data-stage-key="JOINED_GROUP"]')).toBeVisible();
    await expect(panel.locator('[data-stage-key="ATTENDED"]')).toHaveCount(0);
    await expect(panel.locator('[data-stage-key="ENLISTED_FOR_BAPTISM"]')).toHaveCount(0);

    await page.goto('/dashboard/establishment');
    await expect(page.getByRole('heading', { name: /^Establishment$/i })).toBeVisible({
      timeout: 20_000,
    });
    const filters = page.getByTestId('pipeline-stage-filters');
    await expect(filters).toBeVisible({ timeout: 15_000 });
    await expect(filters).toHaveAttribute('data-pipeline-source', 'template');
    await expect(filters.getByRole('button', { name: /New Contacts:/i })).toBeVisible();
    await expect(filters.getByRole('button', { name: /Joined Group:/i })).toBeVisible();
    await expect(filters.getByRole('button', { name: /Engrafted In WSF:/i })).toHaveCount(0);
    await expect(filters.getByRole('button', { name: /Enlisted for Baptism:/i })).toHaveCount(0);
  });

  test('Customize forks simple_visitor definition', async ({ page, request }) => {
    await seedAuth(page, request);
    await page.goto('/dashboard/settings/membership-pipeline');
    await expect(page.getByTestId('pipeline-fork-btn')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('pipeline-fork-btn').click();
    await expect(page.locator('[data-pipeline-source="definition"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('pipeline-active-template-key')).toHaveText('simple_visitor');

    const headers = await assertLogin(request);
    const res = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    const body = await res.json();
    expect(body.source).toBe('definition');
    expect(body.templateKey).toBe('simple_visitor');
    expect(body.stages).toHaveLength(4);
  });
});
