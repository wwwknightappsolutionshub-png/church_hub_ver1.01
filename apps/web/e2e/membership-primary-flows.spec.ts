import { test, expect } from '@playwright/test';
import { seedAuth, skipBrowser } from './helpers/auth';

test.describe('Membership primary flows (Phase 10)', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip');

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('congregants hub loads', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await expect(page.getByRole('heading', { name: /Congregants/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('analytics dashboard loads', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await expect(page.getByText(/Analytics|Growth|Attendance/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('automation hub loads', async ({ page }) => {
    await page.goto('/dashboard/automation');
    await expect(page.getByRole('heading', { name: /^Automation$/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('departments hub loads', async ({ page }) => {
    await page.goto('/dashboard/departments');
    await expect(page.getByRole('heading', { name: /Department tools/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('follow-up board loads', async ({ page }) => {
    await page.goto('/dashboard/follow-up');
    await expect(page.getByText(/Follow-Up|Follow up/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
