/**
 * API e2e — Church Staff unit leader assign / scope / forbid / revoke.
 * Run: npx playwright test e2e/church-staff-unit-leader-api.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, assertLoginAs } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

const PASSWORD = 'ChurchHub123!';
const FOREIGN_UNIT_ID = '99999999-9999-4999-8999-999999999999';

test.describe('Church Staff unit leader API', () => {
  let adminHeaders: Record<string, string>;
  let unitAId: string;
  let unitBId: string;
  let staffId: string;
  let leaderEmail: string;

  test.beforeAll(async ({ request }) => {
    adminHeaders = await assertLogin(request);
    const probe = await request.get(`${API_URL}/church-staff`, { headers: adminHeaders });
    if (!probe.ok()) {
      test.skip(true, `church-staff API unavailable (${probe.status()}). Restart API after pull.`);
    }

    const unitsRes = await request.get(`${API_URL}/service-units`, { headers: adminHeaders });
    expect(unitsRes.ok(), `service-units → ${unitsRes.status()}`).toBeTruthy();
    const units = (await unitsRes.json()) as Array<{ id: string }>;
    expect(units.length).toBeGreaterThanOrEqual(2);
    unitAId = units[0].id;
    unitBId = units[1].id;
    leaderEmail = `pw-unit-leader-${Date.now()}@demo.church`;
  });

  test.afterAll(async ({ request }) => {
    if (!staffId || !adminHeaders) return;
    await request.delete(`${API_URL}/church-staff/${staffId}`, { headers: adminHeaders });
  });

  test('MEMBER cannot manage church staff', async ({ request }) => {
    const headers = await assertLoginAs(request, 'member@demo.church', PASSWORD);
    const list = await request.get(`${API_URL}/church-staff`, { headers });
    expect(list.status()).toBe(403);
  });

  test('rejects unit-only LEADER without units, multi-unit, and foreign unit ids', async ({ request }) => {
    const missing = await request.post(`${API_URL}/church-staff`, {
      headers: adminHeaders,
      data: {
        email: `pw-missing-${Date.now()}@demo.church`,
        password: PASSWORD,
        firstName: 'Missing',
        lastName: 'Units',
        roles: ['LEADER'],
      },
    });
    expect(missing.status()).toBe(400);

    const multi = await request.post(`${API_URL}/church-staff`, {
      headers: adminHeaders,
      data: {
        email: `pw-multi-${Date.now()}@demo.church`,
        password: PASSWORD,
        firstName: 'Multi',
        lastName: 'Units',
        roles: ['LEADER'],
        serviceUnitIds: [unitAId, unitBId],
      },
    });
    expect(multi.status()).toBe(400);

    const foreign = await request.post(`${API_URL}/church-staff`, {
      headers: adminHeaders,
      data: {
        email: `pw-foreign-${Date.now()}@demo.church`,
        password: PASSWORD,
        firstName: 'Foreign',
        lastName: 'Unit',
        roles: ['LEADER'],
        serviceUnitIds: [FOREIGN_UNIT_ID],
      },
    });
    expect(foreign.status()).toBe(400);
  });

  test('assigns unit leadership and scopes access', async ({ request }) => {
    const create = await request.post(`${API_URL}/church-staff`, {
      headers: adminHeaders,
      data: {
        email: leaderEmail,
        password: PASSWORD,
        firstName: 'Play',
        lastName: 'Leader',
        roles: ['LEADER'],
        serviceUnitIds: [unitAId],
      },
    });
    expect(create.ok(), `create staff → ${create.status()}`).toBeTruthy();
    const body = await create.json();
    staffId = body.id;
    expect(body.serviceUnitIds).toEqual([unitAId]);

    const leaderHeaders = await assertLoginAs(request, leaderEmail, PASSWORD);

    const me = await request.get(`${API_URL}/auth/me`, { headers: leaderHeaders });
    expect(me.ok()).toBeTruthy();
    const meBody = await me.json();
    expect(meBody.isChurchStaff).toBe(false);
    expect(meBody.canManageStaff).toBe(false);
    expect(meBody.unitAdminUnitIds).toContain(unitAId);
    expect(meBody.unitAdminUnitIds).not.toContain(unitBId);

    const accessA = await request.get(`${API_URL}/service-units/${unitAId}/access`, {
      headers: leaderHeaders,
    });
    expect((await accessA.json()).canManage).toBe(true);

    const accessB = await request.get(`${API_URL}/service-units/${unitBId}/access`, {
      headers: leaderHeaders,
    });
    expect((await accessB.json()).canManage).toBe(false);

    const createUnit = await request.post(`${API_URL}/service-units`, {
      headers: leaderHeaders,
      data: { name: `PW Should Fail ${Date.now()}` },
    });
    expect(createUnit.status()).toBe(403);

    const staffForbidden = await request.get(`${API_URL}/church-staff`, {
      headers: leaderHeaders,
    });
    expect(staffForbidden.status()).toBe(403);
  });

  test('revokes prior unit and reassigns', async ({ request }) => {
    expect(staffId).toBeTruthy();
    const patch = await request.patch(`${API_URL}/church-staff/${staffId}`, {
      headers: adminHeaders,
      data: { roles: ['LEADER'], serviceUnitIds: [unitBId] },
    });
    expect(patch.ok(), `reassign → ${patch.status()}`).toBeTruthy();
    const body = await patch.json();
    expect(body.serviceUnitIds).toEqual([unitBId]);

    const leaderHeaders = await assertLoginAs(request, leaderEmail, PASSWORD);

    expect(
      (await (await request.get(`${API_URL}/service-units/${unitAId}/access`, { headers: leaderHeaders })).json())
        .canManage,
    ).toBe(false);
    expect(
      (await (await request.get(`${API_URL}/service-units/${unitBId}/access`, { headers: leaderHeaders })).json())
        .canManage,
    ).toBe(true);
  });

  test('clears leadership when demoted to MEMBER', async ({ request }) => {
    expect(staffId).toBeTruthy();
    const patch = await request.patch(`${API_URL}/church-staff/${staffId}`, {
      headers: adminHeaders,
      data: { roles: ['MEMBER'] },
    });
    expect(patch.ok()).toBeTruthy();
    const body = await patch.json();
    expect(body.serviceUnitIds ?? []).toEqual([]);
  });
});
