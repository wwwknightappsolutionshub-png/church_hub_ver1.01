/**
 * Phase 1 membership registry — classifications, family roles, custom fields, properties,
 * dashboard stats, congregant analytics, and CRM-style congregant editor.
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, seedAuth, skipBrowser } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Membership Phase 1 registry API', () => {
  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    const statsRes = await request.get(`${API_URL}/membership/stats`, { headers });
    if (!statsRes.ok()) {
      test.skip(true, `Membership API unavailable (${statsRes.status()})`);
    }
  });

  test('GET registry catalog seeds defaults', async ({ request }) => {
    const res = await request.get(`${API_URL}/membership/registry/catalog`, { headers });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.classifications?.length).toBeGreaterThan(0);
    expect(body.familyRoles?.length).toBeGreaterThan(0);
    expect(body.memberProperties?.length).toBeGreaterThan(0);
    expect(Array.isArray(body.serviceUnits)).toBeTruthy();
    expect(Array.isArray(body.cellBranches)).toBeTruthy();
    const names = (body.classifications as Array<{ name: string }>).map((c) => c.name);
    expect(names).toContain('Member');
    expect(names).toContain('Guest');
  });

  test('GET stats includes phase-1 dashboard fields', async ({ request }) => {
    const res = await request.get(`${API_URL}/membership/stats`, { headers });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.congregants).toBe('number');
    expect(typeof body.churchUnits).toBe('number');
    expect(typeof body.childrenChurch).toBe('number');
    expect(typeof body.families).toBe('number');
  });

  test('GET congregant analytics returns chart series', async ({ request }) => {
    const res = await request.get(`${API_URL}/membership/registry/congregant-analytics`, {
      headers,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.byClassification)).toBeTruthy();
    expect(Array.isArray(body.byGender)).toBeTruthy();
    expect(Array.isArray(body.byFamilyRole)).toBeTruthy();
    expect(Array.isArray(body.byAgeDistribution)).toBeTruthy();
  });

  test('GET email-links returns mailto shape', async ({ request }) => {
    const res = await request.get(`${API_URL}/membership/registry/email-links`, { headers });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('all');
    expect(body).toHaveProperty('bcc');
    expect(Array.isArray(body.byFamilyRole)).toBeTruthy();
  });

  test('GET admin-catalog includes inactive definitions for admins', async ({ request }) => {
    const res = await request.get(`${API_URL}/membership/registry/admin-catalog`, { headers });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.classifications?.length).toBeGreaterThan(0);
    expect(body.familyRoles?.length).toBeGreaterThan(0);
    expect(Array.isArray(body.memberCustomFields)).toBeTruthy();
    expect(Array.isArray(body.familyCustomFields)).toBeTruthy();
  });

  test('PATCH member custom field updates label', async ({ request }) => {
    const createRes = await request.post(`${API_URL}/membership/registry/member-custom-fields`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        fieldKey: `e2e_member_field_${Date.now()}`,
        label: 'E2E Member Field',
        fieldType: 'TEXT',
      },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const field = (await createRes.json()) as { id: string; label: string };
    const newLabel = `${field.label} Updated`;
    const patchRes = await request.patch(
      `${API_URL}/membership/registry/member-custom-fields/${field.id}`,
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        data: { label: newLabel },
      },
    );
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy();
    const updated = await patchRes.json();
    expect(updated.label).toBe(newLabel);
  });

  test('POST member rejects missing required contact fields', async ({ request }) => {
    const createRes = await request.post(`${API_URL}/membership/members`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        firstName: 'Missing',
        lastName: 'Fields',
        startOnboarding: false,
        requireContactFields: true,
      },
    });
    expect(createRes.status()).toBe(400);
    const body = await createRes.json();
    expect(String(body.message ?? '')).toMatch(/email|phone|address|post code/i);
  });

  test('POST member as congregant with classification and family role', async ({ request }) => {
    const catalogRes = await request.get(`${API_URL}/membership/registry/catalog`, { headers });
    const catalog = await catalogRes.json();
    const classificationId = catalog.classifications[0]?.id as string;
    const familyRoleId = catalog.familyRoles[0]?.id as string;
    expect(classificationId).toBeTruthy();

    const createRes = await request.post(`${API_URL}/membership/members`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        firstName: 'Phase1',
        lastName: `Congregant${Date.now()}`,
        email: `phase1-${Date.now()}@example.com`,
        cellPhone: '+15550100100',
        address: '10 Church Lane',
        zip: 'AB1 2CD',
        gender: 'MALE',
        classificationId,
        familyRoleId,
        createFamily: true,
        startOnboarding: false,
        requireContactFields: true,
      },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const member = await createRes.json();
    expect(member.classification?.id ?? member.classificationId).toBe(classificationId);
  });

  test('POST member assigns service units and cell branch', async ({ request }) => {
    const catalogRes = await request.get(`${API_URL}/membership/registry/catalog`, { headers });
    const catalog = await catalogRes.json();
    const serviceUnitId = catalog.serviceUnits?.[0]?.id as string | undefined;
    const cellBranchId = catalog.cellBranches?.[0]?.id as string | undefined;
    test.skip(!serviceUnitId && !cellBranchId, 'No service units or cell branches seeded');

    const stamp = Date.now();
    const createRes = await request.post(`${API_URL}/membership/members`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        firstName: 'Groups',
        lastName: `Member${stamp}`,
        email: `groups-${stamp}@example.com`,
        cellPhone: '+15550100200',
        address: '22 Fellowship Road',
        zip: 'XY9 8ZZ',
        startOnboarding: false,
        requireContactFields: true,
        serviceUnitIds: serviceUnitId ? [serviceUnitId] : [],
        cellBranchId: cellBranchId ?? null,
      },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const member = await createRes.json();

    if (serviceUnitId) {
      const unitMembersRes = await request.get(`${API_URL}/service-units/${serviceUnitId}/members`, {
        headers,
      });
      expect(unitMembersRes.ok()).toBeTruthy();
      const unitMembers = await unitMembersRes.json();
      const ids = (unitMembers as Array<{ memberId?: string; member?: { id: string } }>).map(
        (row) => row.memberId ?? row.member?.id,
      );
      expect(ids).toContain(member.id);
    }

    if (cellBranchId) {
      const branchRes = await request.get(`${API_URL}/ministry-cells/branches/${cellBranchId}`, {
        headers,
      });
      expect(branchRes.ok()).toBeTruthy();
      const branch = await branchRes.json();
      const memberIds = (branch.members as Array<{ memberId?: string; member?: { id: string } }>).map(
        (row) => row.memberId ?? row.member?.id,
      );
      expect(memberIds).toContain(member.id);
    }
  });
});

test.describe('Membership Phase 1 registry UI', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip');

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('dashboard shows stat cards, shortcuts, and feature nav', async ({ page }) => {
    await page.goto('/dashboard/membership');
    await expect(page.getByRole('heading', { name: /Congregants/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('congregants-feature-nav')).toBeVisible();
    await expect(page.getByTestId('stat-card-families')).toBeVisible();
    await expect(page.getByTestId('stat-card-church-units')).toBeVisible();
    await expect(page.getByTestId('stat-card-members')).toBeVisible();
    await expect(page.getByTestId('stat-card-childrens-church')).toBeVisible();
    await expect(page.getByTestId('membership-quick-links')).toBeVisible();
    await expect(page.getByTestId('congregant-list')).not.toBeVisible();
  });

  test('analytics route redirects to reports', async ({ page }) => {
    await page.goto('/dashboard/membership/analytics');
    await expect(page).toHaveURL(/\/dashboard\/membership\/reports/);
  });

  test('add congregant opens multi-step CRM-style editor form', async ({ page }) => {
    await page.goto('/dashboard/membership/members');
    await page.getByTestId('quick-add-congregant').click();
    const form = page.getByTestId('congregant-editor-form');
    await expect(form).toBeVisible();
    await expect(form.getByRole('heading', { name: 'Name & Identity' })).toBeVisible();
    await form.locator('label').filter({ hasText: 'First Name' }).locator('input').fill('E2E');
    await form.locator('label').filter({ hasText: 'Last Name' }).locator('input').fill('Congregant');
    await form.getByRole('button', { name: 'Next' }).click();
    await expect(form.getByRole('heading', { name: 'Birth & Family' })).toBeVisible();
    await form.getByRole('button', { name: 'Next' }).click();
    await expect(form.getByRole('heading', { name: 'Contact Information' })).toBeVisible();
    await form.getByRole('textbox', { name: 'Email *' }).fill('e2e@example.com');
    await form.getByRole('textbox', { name: 'Mobile Phone *' }).fill('5550100');
    await form.getByRole('textbox', { name: 'Address 1 *' }).fill('1 Test Street');
    await form.getByRole('textbox', { name: 'Post Code *' }).fill('TE5 7ER');
    await form.getByRole('button', { name: 'Next' }).click();
    await expect(form.getByRole('heading', { name: 'Service Groups' })).toBeVisible();
    await expect(form.getByText('Unit Member', { exact: true })).toBeVisible();
    await form.getByText('Cell Membership', { exact: true }).scrollIntoViewIfNeeded();
    await expect(form.getByText('Cell Membership', { exact: true })).toBeVisible();
    await form.getByRole('button', { name: 'Next' }).click();
    await expect(form.getByRole('heading', { name: 'Classification & Dates' })).toBeVisible();
  });

  test('members page shows list and search', async ({ page }) => {
    await page.goto('/dashboard/membership/members');
    await expect(page.getByTestId('congregant-list')).toBeVisible();
    await expect(page.getByTestId('congregant-search')).toBeVisible();
  });

  test('settings page shows registry admin panel', async ({ page }) => {
    await page.goto('/dashboard/membership/settings');
    await expect(page.getByTestId('membership-registry-settings')).toBeVisible();
    await expect(page.getByTestId('classifications-table')).toBeVisible();
  });

  test('email BCC menu lists family roles', async ({ page }) => {
    await page.goto('/dashboard/membership/communications');
    const menu = page.getByTestId('email-bcc-menu');
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('add family dialog shows custom fields when defined', async ({ page, request }) => {
    const headers = await assertLogin(request);
    await request.post(`${API_URL}/membership/registry/family-custom-fields`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        fieldKey: `e2e_family_field_${Date.now()}`,
        label: 'E2E Family Field',
        fieldType: 'TEXT',
      },
    });

    await page.goto('/dashboard/membership/families?add=1');
    const dialog = page.getByTestId('family-editor-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('label').filter({ hasText: 'Family Name' }).locator('input').fill('E2E Family');
    await dialog.getByRole('button', { name: 'Next' }).click();
    await dialog.getByRole('button', { name: 'Next' }).click();
    await dialog.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByTestId('custom-fields-section')).toBeVisible();
  });
});
