/**
 * Browser e2e — Church Staff assigns unit leader; leader is scoped (no staff admin).
 * Run: npx playwright test e2e/church-staff-unit-leader.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, seedAuth, skipBrowser } from './helpers/auth';

test.describe('Church Staff unit leader (UI)', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip');

  const password = 'ChurchHub123!';
  let leaderEmail: string;
  let staffId: string;
  let unitName: string;

  test.afterAll(async ({ request }) => {
    if (!staffId) return;
    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'admin@demo.church', password },
    });
    if (!login.ok()) return;
    const { accessToken } = await login.json();
    await request.delete(`${API_URL}/church-staff/${staffId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });

  test('admin assigns LEADER to a service unit from Church Staff', async ({ page, request }) => {
    await seedAuth(page, request);

    const unitsRes = await request.get(`${API_URL}/service-units`, {
      headers: {
        Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('accessToken'))}`,
      },
    });
    expect(unitsRes.ok()).toBeTruthy();
    const units = (await unitsRes.json()) as Array<{ id: string; name: string }>;
    expect(units.length).toBeGreaterThan(0);
    unitName = units[0].name;
    leaderEmail = `ui-unit-leader-${Date.now()}@demo.church`;

    await page.goto('/dashboard/staff');
    await expect(page.getByRole('heading', { name: /Church staff/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: /Add staff/i }).click();
    await page.getByLabel(/^Email$/i).fill(leaderEmail);
    await page.getByLabel(/^Password/i).fill(password);
    await page.getByLabel(/First name/i).fill('UI');
    await page.getByLabel(/Last name/i).fill('UnitLeader');

    // Default role is ADMIN — switch to unit-only LEADER.
    await page.getByRole('button', { name: /^ADMIN$/i }).click();
    await page.getByRole('button', { name: /^LEADER$/i }).click();
    await expect(page.getByText(/unit leader only/i)).toBeVisible();

    await page.getByRole('button', { name: unitName, exact: true }).click();
    await page.getByRole('button', { name: /^Save$/i }).click();

    await expect(page.getByText(leaderEmail)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(unitName).first()).toBeVisible();

    const listRes = await request.get(`${API_URL}/church-staff`, {
      headers: {
        Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('accessToken'))}`,
      },
    });
    const staff = (await listRes.json()) as Array<{ id: string; email: string }>;
    const created = staff.find((s) => s.email === leaderEmail);
    expect(created).toBeTruthy();
    staffId = created!.id;
  });

  test('unit leader cannot open Church Staff admin page', async ({ page, request }) => {
    expect(leaderEmail).toBeTruthy();
    await seedAuth(page, request, { email: leaderEmail, password });

    await page.goto('/dashboard/staff');
    await expect(page).not.toHaveURL(/\/dashboard\/staff$/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard(\/lounge)?/, { timeout: 20_000 });
  });
});
