/**
 * Browser e2e — New Unit wizard (with-setup) + unit-leader landing (not Lounge).
 * Run: npx playwright test e2e/service-unit-create-wizard.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, seedAuth, skipBrowser } from './helpers/auth';

test.describe('Service unit create wizard + unit-leader home', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip');

  const password = 'ChurchHub123!';
  const unitName = `PW Wizard ${Date.now()}`;
  let createdUnitId: string | undefined;
  let leaderEmail: string;
  let staffId: string | undefined;

  test.afterAll(async ({ request }) => {
    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'admin@demo.church', password },
    });
    if (!login.ok()) return;
    const { accessToken } = await login.json();
    if (staffId) {
      await request.delete(`${API_URL}/church-staff/${staffId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
    if (createdUnitId) {
      await request.delete(`${API_URL}/service-units/${createdUnitId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  });

  test('admin creates a unit via wizard (skip members + skip leader)', async ({
    page,
    request,
  }) => {
    await seedAuth(page, request);
    await page.goto('/dashboard/service-units');
    await expect(page.getByRole('heading', { name: /Service Unit/i }).first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: /New unit/i }).first().click();
    const wizard = page.getByTestId('create-service-unit-wizard');
    await expect(wizard).toBeVisible({ timeout: 10_000 });

    await wizard.getByLabel(/Unit Name/i).fill(unitName);
    await wizard.getByRole('button', { name: /^Next$/i }).click();

    await expect(wizard.getByText(/Add Members/i)).toBeVisible();
    await wizard.getByRole('button', { name: /Skip members/i }).click();

    await expect(wizard.getByText(/Add A Leader|Unit admin/i)).toBeVisible();
    await wizard.getByRole('button', { name: /Skip leader/i }).click();

    await expect(wizard.getByText(/Preview/i)).toBeVisible();
    await wizard.getByRole('button', { name: /Create Unit/i }).click();

    await expect(page.getByText(unitName).first()).toBeVisible({ timeout: 20_000 });

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const unitsRes = await request.get(`${API_URL}/service-units`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(unitsRes.ok()).toBeTruthy();
    const units = (await unitsRes.json()) as Array<{ id: string; name: string }>;
    const created = units.find((u) => u.name === unitName);
    expect(created).toBeTruthy();
    createdUnitId = created!.id;
  });

  test('unit leader lands on service unit hub, not Lounge', async ({ page, request }) => {
    expect(createdUnitId).toBeTruthy();
    await seedAuth(page, request);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    leaderEmail = `pw-wizard-leader-${Date.now()}@demo.church`;

    const createStaff = await request.post(`${API_URL}/church-staff`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        firstName: 'PW',
        lastName: 'WizardLeader',
        email: leaderEmail,
        roles: ['LEADER'],
        serviceUnitIds: [createdUnitId],
      },
    });
    expect(createStaff.ok()).toBeTruthy();
    const created = (await createStaff.json()) as { id: string };
    staffId = created.id;

    const patch = await request.patch(`${API_URL}/church-staff/${staffId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { password },
    });
    expect(patch.ok()).toBeTruthy();

    await seedAuth(page, request, { email: leaderEmail, password });
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard\/service-units/, { timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/dashboard\/lounge/);
  });
});
