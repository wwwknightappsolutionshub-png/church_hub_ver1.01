/**
 * Phase 7 — Settings shows updates available + diff/merge UI.
 * Run: npx playwright test e2e/pipeline-option-c-phase7-ui.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 7 — updates UI', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  const addedKey = `P7_UI_${String(Date.now()).slice(-6)}`;

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/follow-up/pipeline');
    const headers = await assertLogin(request);
    await request.post(`${API_URL}/follow-up/pipeline/discard`, { headers, data: {} });
    await request.put(`${API_URL}/follow-up/pipeline/base-template`, {
      headers,
      data: { templateKey: 'simple_visitor' },
    });
    await request.post(`${API_URL}/follow-up/pipeline/fork`, {
      headers,
      data: { templateKey: 'simple_visitor' },
    });
    await request.post(`${API_URL}/follow-up/pipeline/templates/simple_visitor/bump`, {
      headers,
      data: {
        stages: [
          {
            key: addedKey,
            label: 'UI Added Stage',
            shortLabel: 'UIAdd',
            phaseKey: 'belonging',
            phaseStep: 3,
            phaseTitle: 'Belonging & Discipleship',
          },
        ],
      },
    });
  });

  test('Settings panel shows updates and merges from diff view', async ({ page, request }) => {
    await seedAuth(page, request);
    await page.goto('/dashboard/settings/membership-pipeline');
    await expect(page.getByRole('heading', { name: /Membership Pipeline/i })).toBeVisible({
      timeout: 20_000,
    });
    const cookies = page.getByRole('button', { name: /Essential only|Accept all/i });
    if (await cookies.first().isVisible().catch(() => false)) {
      await cookies.first().click();
    }

    const panel = page.getByTestId('pipeline-updates-panel');
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel).toHaveAttribute('data-updates-available', 'true');
    await expect(panel.getByText(/Updates available/i)).toBeVisible();

    await page.getByTestId('pipeline-diff-toggle').click();
    const diff = page.getByTestId('pipeline-diff-view');
    await expect(diff).toBeVisible();
    await expect(diff.getByText(addedKey)).toBeVisible();
    await page.screenshot({
      path: '../../docs/qa/pipeline-option-c/phase-7/diff-ui.png',
      fullPage: true,
    });

    await page.getByTestId('pipeline-merge-btn').click();
    await expect(panel).toHaveAttribute('data-updates-available', 'false', { timeout: 15_000 });

    const headers = await assertLogin(request);
    const res = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    const body = await res.json();
    expect(body.stages.map((s: { key: string }) => s.key)).toContain(addedKey);
  });
});
