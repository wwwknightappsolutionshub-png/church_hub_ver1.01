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

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const unitsRes = await request.get(`${API_URL}/service-units`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(unitsRes.ok()).toBeTruthy();
    const units = (await unitsRes.json()) as Array<{ id: string; name: string }>;
    expect(units.length).toBeGreaterThan(0);
    unitName = units[0].name;
    leaderEmail = `ui-unit-leader-${Date.now()}@demo.church`;

    await page.goto('/dashboard/staff');
    await expect(page.getByRole('heading', { name: /Church Officers/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: /Add staff/i }).click();
    const wizard = page.getByTestId('staff-account-wizard');
    await expect(wizard).toBeVisible();

    await wizard.getByLabel(/^First name$/i).fill('UI');
    await wizard.getByLabel(/^Last name$/i).fill('UnitLeader');
    await wizard.getByLabel(/^Email$/i).fill(leaderEmail);
    await expect(wizard.getByText(/set-password link|Passwords are never sent/i)).toBeVisible();
    await wizard.getByRole('button', { name: /^Next$/i }).click();

    await expect(wizard.getByText(/What access type are you assigning/i)).toBeVisible();
    await wizard.getByRole('button', { name: /Unit Leader/i }).click();
    await wizard.getByRole('button', { name: /^Next$/i }).click();

    await expect(wizard.getByText(/Which service unit will/i)).toBeVisible();
    await wizard.getByRole('button', { name: unitName, exact: true }).click();
    await wizard.getByRole('button', { name: /Create account/i }).click();

    await expect(page.getByText(leaderEmail)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(unitName).first()).toBeVisible();

    const listRes = await request.get(`${API_URL}/church-staff`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const staff = (await listRes.json()) as Array<{ id: string; email: string }>;
    const created = staff.find((s) => s.email === leaderEmail);
    expect(created).toBeTruthy();
    staffId = created!.id;

    // Set a known password so the scoped-access login test can run (invite link is email-only).
    const patch = await request.patch(`${API_URL}/church-staff/${staffId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { password },
    });
    expect(patch.ok()).toBeTruthy();
  });

  test('unit leader cannot open Church Staff admin page', async ({ page, request }) => {
    expect(leaderEmail).toBeTruthy();
    await seedAuth(page, request, { email: leaderEmail, password });

    await page.goto('/dashboard/staff');
    await expect(page).not.toHaveURL(/\/dashboard\/staff$/, { timeout: 20_000 });
    // Unit leaders land on Service Unit Hub (not Lounge).
    await expect(page).toHaveURL(/\/dashboard\/service-units/, { timeout: 20_000 });
  });
});
