import { test, expect } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000/api/v1';
const EMAIL = process.env.E2E_LOGIN_EMAIL ?? 'admin@demo.church';
const PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? 'ChurchHub123!';

const skipBrowser =
  process.env.SKIP_E2E === 'true' || process.env.SKIP_PLAYWRIGHT === 'true';

const ROUTES = [
  '/dashboard/membership',
  '/dashboard/analytics',
  '/dashboard/automation',
  '/dashboard/departments',
];

test.describe('Membership UI responsiveness (Phase 10)', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip');

  test.beforeEach(async ({ page }) => {
    const loginRes = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    if (!loginRes.ok()) test.skip(true, 'API unavailable');
    const body = await loginRes.json();
    await page.addInitScript(
      ({ accessToken, refreshToken }) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      },
      {
        accessToken: body.accessToken as string,
        refreshToken: (body.refreshToken as string) ?? '',
      },
    );
  });

  for (const route of ROUTES) {
    test(`mobile viewport: ${route} has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      await page.waitForTimeout(1500);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 2;
      });
      expect(overflow).toBe(false);
    });
  }
});
