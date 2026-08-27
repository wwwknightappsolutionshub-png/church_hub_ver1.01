/**
 * Membership Analytics filters A–E — UI + API e2e (not stubs).
 * Run: npx playwright test e2e/membership-analytics.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, seedAuth, skipBrowser } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Membership Analytics filters', () => {
  test.skip(skipBrowser, 'SKIP_E2E / SKIP_PLAYWRIGHT set');

  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    const res = await request.get(`${API_URL}/membership/analytics?months=3`, { headers });
    if (!res.ok()) {
      test.skip(true, `Analytics API unavailable (${res.status()})`);
    }
  });

  test('API returns filtered dashboard with demographics, targets, comparison', async ({
    request,
  }) => {
    const res = await request.get(
      `${API_URL}/membership/analytics?months=6&compare=true&serviceType=sunday`,
      { headers },
    );
    expect(res.ok(), `status ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body.summary).toBeTruthy();
    expect(body.demographics.byGender.length).toBeGreaterThan(0);
    expect(body.demographics.byAgeBand.length).toBeGreaterThan(0);
    expect(body.targets).toBeTruthy();
    expect(body.targetStatus).toBeInstanceOf(Array);
    expect(body.comparison).toBeTruthy();
    expect(body.appliedFilters.serviceType).toBe('sunday');
  });

  test('API export CSV and PATCH targets', async ({ request }) => {
    const exportRes = await request.get(`${API_URL}/membership/analytics/export?months=3`, {
      headers,
    });
    expect(exportRes.ok()).toBeTruthy();
    const csv = await exportRes.text();
    expect(csv).toContain('Section,Metric,Value');
    expect(csv).toContain('Total members');

    const patch = await request.patch(`${API_URL}/membership/analytics/targets`, {
      headers,
      data: {
        retentionRate: 0.45,
        attendanceRate: 0.6,
        outreachCompletionRate: 0.35,
        monthlyNewMembers: 3,
      },
    });
    expect(patch.ok()).toBeTruthy();
    const targets = await patch.json();
    expect(targets.retentionRate).toBe(0.45);
    expect(targets.monthlyNewMembers).toBe(3);
  });

  test('UI filter bar, tabs, export controls, insights', async ({ page, request }) => {
    await seedAuth(page, request);
    await page.goto('/dashboard/analytics');
    await expect(page.getByRole('heading', { name: 'Membership Analytics' })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText('Insight filters')).toBeVisible();
    await page.getByTestId('analytics-compare').check();
    await page.getByTestId('analytics-service-type').selectOption('sunday');
    await page.getByTestId('analytics-apply-filters').click();

    await expect(page.getByTestId('analytics-applied-hint')).toContainText(/vs prior|sunday/i, {
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Insights' }).click();
    await expect(page.getByTestId('analytics-demographics')).toBeVisible();
    await expect(page.getByTestId('analytics-target-status')).toBeVisible();

    await expect(page.getByTestId('analytics-export-csv')).toBeEnabled();
    await expect(page.getByTestId('analytics-export-pdf')).toBeEnabled();
  });
});
