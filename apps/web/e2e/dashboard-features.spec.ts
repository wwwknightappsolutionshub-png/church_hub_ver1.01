/**
 * UI smoke — dashboard calendar, automation templates, communications, admin reports, landing preview.
 * Run: npx playwright test e2e/dashboard-features.spec.ts
 */
import { test, expect } from '@playwright/test';
import { seedAuth, skipBrowser, E2E_EMAIL, E2E_PASSWORD } from './helpers/auth';

test.describe('Dashboard feature UI', () => {
  test.beforeEach(async ({ page, request }) => {
    test.skip(skipBrowser, 'Browser E2E skipped');
    await seedAuth(page, request);
  });

  test('dashboard shows attendance chart and church calendar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Attendance Performance')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('dashboard-church-calendar')).toBeVisible();
    await expect(page.getByText('Church Calendar')).toBeVisible();
    await expect(page.getByText('Recent Activity')).toHaveCount(0);
  });

  test('automation email templates WYSIWYG editor', async ({ page }) => {
    await page.goto('/dashboard/automation');
    await page.getByTestId('automation-email-templates-tab').click();
    await expect(page.getByTestId('automation-email-templates')).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByTestId('automation-template-wysiwyg')).toBeVisible();
    await expect(page.getByTestId('automation-template-wysiwyg').getByRole('textbox')).toBeVisible();
  });

  test('communications hub corporate layout', async ({ page }) => {
    await page.goto('/dashboard/communications');
    await expect(page.getByText('Corporate communications')).toBeVisible();
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Communication Hub' })).toBeVisible();
  });

  test('admin reports urgency strip', async ({ page }) => {
    await page.goto('/dashboard/admin-reports');
    await expect(page.getByTestId('reports-urgency-strip')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Critical')).toBeVisible();
    await expect(page.getByText('High')).toBeVisible();
    await expect(page.getByTestId('reports-inbox-grid')).toBeVisible();
    await expect(page.getByTestId('reports-weekly-inbox')).toBeVisible();
    await expect(page.getByTestId('reports-queue-inbox')).toBeVisible();
    await expect(page.getByTestId('reports-notifications-inbox')).toBeVisible();
  });

  test('church landing equal-height editor and preview columns', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/dashboard/church-landing');
    const preview = page.getByTestId('church-landing-live-preview');
    await expect(preview).toBeVisible({ timeout: 15000 });
    await expect(preview.getByText('Live preview', { exact: true })).toBeVisible();

    const editorColumn = page.getByTestId('church-landing-editor-column');
    const previewColumn = page.getByTestId('church-landing-preview-column');
    await expect(editorColumn).toBeVisible();
    await expect(previewColumn).toBeVisible();

    const editorBox = await editorColumn.boundingBox();
    const previewBox = await previewColumn.boundingBox();
    expect(editorBox?.height ?? 0).toBeGreaterThan(400);
    expect(Math.abs((editorBox?.height ?? 0) - (previewBox?.height ?? 0))).toBeLessThan(8);

    const viewport = page.getByTestId('church-landing-preview-viewport');
    await expect(viewport).toBeVisible();
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox?.height ?? 0).toBeGreaterThan(300);
  });
});
