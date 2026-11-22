/**
 * Phase 4 — worker chrome binds to resolved pipeline; export/PDF uses definition.
 * Run: npx playwright test e2e/pipeline-option-c-phase4-ui.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';
import { resetPipelineOptionCDemo } from './helpers/pipeline-option-c';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 4 — worker + export bind', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/follow-up/pipeline');
    const headers = await assertLogin(request);
    await resetPipelineOptionCDemo(request, headers);
  });

  test('manager export control still present with resolved pipeline', async ({ page, request }) => {
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

    const directoryTab = page.getByRole('tab', { name: /Contact Directory|Directory|Table/i });
    if (await directoryTab.isVisible().catch(() => false)) {
      await directoryTab.click();
    }
    const exportBtn = page.getByRole('button', { name: /Export PDF/i });
    await expect(exportBtn).toBeVisible({ timeout: 10_000 });
  });

  test('worker dashboard binds pipeline source when harvester logs in', async ({
    page,
    request,
  }) => {
    await seedAuth(page, request, {
      email: 'harvester@demo.church',
      password: 'ChurchHub123!',
    });
    await page.goto('/dashboard/establishment');
    await expect(page.getByRole('heading', { name: /^Establishment$/i })).toBeVisible({
      timeout: 20_000,
    });
    const cookies = page.getByRole('button', { name: /Essential only|Accept all/i });
    if (await cookies.first().isVisible().catch(() => false)) {
      await cookies.first().click();
    }

    const dash = page.getByTestId('establishment-worker-dashboard');
    await expect(dash).toBeVisible({ timeout: 15_000 });
    await expect(dash).toHaveAttribute('data-pipeline-source', 'template');
    await expect(page.getByRole('button', { name: /Assigned contacts/i })).toBeVisible();
  });

  test('API still returns winners_default for convert mapping consumers', async ({ request }) => {
    const headers = await assertLogin(request);
    const res = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.templateKey).toBe('winners_default');
  });
});
