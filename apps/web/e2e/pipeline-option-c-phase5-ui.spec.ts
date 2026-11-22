/**
 * Phase 5 — Admin forks in Settings and sees updated label on Establishment tabs.
 * Run: npx playwright test e2e/pipeline-option-c-phase5-ui.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 5 — admin customize UI', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  const label = `Fresh Leads ${Date.now().toString().slice(-5)}`;

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/follow-up/pipeline');
  });

  test('Settings pipeline page can fork and rename NEW_LEAD', async ({ page, request }) => {
    const headers = await assertLogin(request);
    // Ensure definition exists via API so UI edit path is ready even if fork already done
    await request.post(`${API_URL}/follow-up/pipeline/fork`, { headers, data: {} });

    await seedAuth(page, request);
    await page.goto('/dashboard/settings/membership-pipeline');
    await expect(page.getByRole('heading', { name: /Membership Pipeline/i })).toBeVisible({
      timeout: 20_000,
    });
    const cookies = page.getByRole('button', { name: /Essential only|Accept all/i });
    if (await cookies.first().isVisible().catch(() => false)) {
      await cookies.first().click();
    }

    const panel = page.getByTestId('membership-pipeline-settings');
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.locator('[data-pipeline-source="definition"]')).toBeVisible({
      timeout: 10_000,
    });

    const row = panel.locator('[data-stage-key="NEW_LEAD"]');
    await expect(row).toBeVisible();
    const labelInput = row.locator('input').first();
    await labelInput.fill(label);
    await row.getByRole('button', { name: /^Save$/i }).click();
    await expect(page.getByText(/Updated/i).first()).toBeVisible({ timeout: 10_000 }).catch(() => {
      /* toast may dismiss quickly */
    });

    // Confirm via resolve API
    const res = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    const body = await res.json();
    expect(body.source).toBe('definition');
    expect(body.stages.find((s: { key: string }) => s.key === 'NEW_LEAD')?.label).toBe(label);
  });

  test('Establishment stage filter shows renamed label', async ({ page, request }) => {
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
    await expect(filters).toHaveAttribute('data-pipeline-source', 'definition');
    await expect(filters.getByRole('button', { name: new RegExp(`${label}:`, 'i') })).toBeVisible({
      timeout: 10_000,
    });
  });
});
