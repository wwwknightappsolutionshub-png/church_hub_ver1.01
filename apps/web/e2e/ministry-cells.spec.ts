import { test, expect } from '@playwright/test';
import {
  API_URL,
  authHeaders,
  seedAuth,
  skipBrowser,
  skipUnlessApiOk,
} from './helpers/auth';

const runId = Date.now().toString(36);
const branchName = `E2E Cell ${runId}`;
const teachingTitle = `E2E Lesson ${runId}`;
const prayerTitle = `E2E Prayer ${runId}`;
const reminderTitle = `E2E Reminder ${runId}`;

async function selectBranch(page: import('@playwright/test').Page, name: string) {
  await page.getByTestId('branch-picker-item').filter({ hasText: name }).click();
}

async function openWorkspaceSection(page: import('@playwright/test').Page, section: string) {
  await page
    .getByRole('navigation', { name: 'Branch workspace sections' })
    .getByRole('button', { name: section, exact: true })
    .click();
}

test.describe.configure({ mode: 'serial' });

test.describe('Ministry/Cells end-to-end', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/ministry-cells/context');
  });

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('API context and module access', async ({ request }) => {
    const headers = await authHeaders(request);
    const res = await request.get(`${API_URL}/ministry-cells/context`, { headers });
    expect(res.ok()).toBeTruthy();
    const ctx = await res.json();
    expect(ctx.role).toMatch(/admin|pastor/);
    expect(ctx.canManage).toBe(true);
    expect(ctx.canViewAnalytics).toBe(true);
  });

  test('page loads with branches tab', async ({ page }) => {
    await page.goto('/dashboard/ministry-cells');
    await expect(page.getByRole('heading', { name: 'Ministry/Cells' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: 'Branches' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cell Performance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Setup' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add New Cell' })).toBeVisible();
  });

  test('create branch with leader assignment', async ({ page, request }) => {
    await page.goto('/dashboard/ministry-cells');
    await expect(page.getByRole('heading', { name: 'Ministry/Cells' })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Add New Cell' }).click();
    await page.locator('#name').fill(branchName);
    await page.locator('#location').fill('E2E Test Area');

    const leaderSelect = page.locator('#create-leader');
    await expect(leaderSelect).toBeVisible({ timeout: 10_000 });
    const options = leaderSelect.locator('option');
    const count = await options.count();
    if (count > 1) {
      await leaderSelect.selectOption({ index: 1 });
    }

    await page.getByRole('button', { name: 'Create cell' }).click();
    await expect(page.getByTestId('branch-picker-item').filter({ hasText: branchName })).toBeVisible({
      timeout: 15_000,
    });

    const headers = await authHeaders(request);
    const branches = await request.get(`${API_URL}/ministry-cells/branches`, { headers });
    expect(branches.ok()).toBeTruthy();
    const list = await branches.json();
    expect(list.some((b: { name: string }) => b.name === branchName)).toBe(true);
  });

  test('select branch, edit branch, and save', async ({ page }) => {
    await page.goto('/dashboard/ministry-cells');
    await selectBranch(page, branchName);

    await expect(page.getByRole('button', { name: 'Edit branch' })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: 'Edit branch' }).click();

    const updatedName = `${branchName} Updated`;
    await page.locator('#edit-name').fill(updatedName);
    await page.locator('#edit-location').fill('E2E Updated Location');

    const leaderSelect = page.locator('#edit-leader');
    if ((await leaderSelect.locator('option').count()) > 1) {
      await leaderSelect.selectOption({ index: 1 });
    }

    await page.getByRole('button', { name: 'Save branch' }).click();
    await expect(page.getByRole('heading', { name: updatedName })).toBeVisible({ timeout: 15_000 });
  });

  test('add and remove member on branch', async ({ page, request }) => {
    const headers = await authHeaders(request);
    const branchesRes = await request.get(`${API_URL}/ministry-cells/branches`, { headers });
    const branches = await branchesRes.json();
    const branch = branches.find((b: { name: string }) => b.name.includes('E2E Cell'));
    expect(branch).toBeTruthy();

    const membersRes = await request.get(
      `${API_URL}/ministry-cells/available-members?branchId=${branch.id}`,
      { headers },
    );
    expect(membersRes.ok()).toBeTruthy();
    const available = await membersRes.json();
    test.skip(available.length === 0, 'No available members in seed data');

    await page.goto('/dashboard/ministry-cells');
    await selectBranch(page, branch.name);
    await openWorkspaceSection(page, 'Membership Directory');
    await expect(page.getByRole('heading', { name: branch.name })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Add member' }).click();
    await page.locator('#member-search').fill(available[0].firstName);
    const picker = page.locator('select').filter({ hasText: available[0].firstName });
    await expect(picker).toBeVisible({ timeout: 10_000 });
    await picker.selectOption(available[0].id);
    await page.getByRole('button', { name: 'Add to branch' }).click();

    await expect(
      page.getByText(`${available[0].firstName} ${available[0].lastName}`),
    ).toBeVisible({ timeout: 15_000 });

    const memberRow = page
      .locator('li')
      .filter({ hasText: `${available[0].firstName} ${available[0].lastName}` });
    await memberRow.getByRole('button', { name: new RegExp(`Remove ${available[0].firstName}`) }).click();

    await expect(
      page.locator('li').filter({ hasText: `${available[0].firstName} ${available[0].lastName}` }),
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test('record attendance and send report', async ({ page, request }) => {
    const headers = await authHeaders(request);
    await request.post(`${API_URL}/ministry-cells/forms/seed-defaults`, { headers });

    await page.goto('/dashboard/ministry-cells');
    const branchesRes = await request.get(`${API_URL}/ministry-cells/branches`, { headers });
    const branches = await branchesRes.json();
    const branch = branches.find((b: { name: string }) => b.name.includes('E2E Cell'));
    await page.goto('/dashboard/ministry-cells');
    await selectBranch(page, branch.name);
    await openWorkspaceSection(page, 'Submit Attendance');
    await expect(page.getByRole('heading', { name: branch.name })).toBeVisible({ timeout: 10_000 });

    await page.locator('input[type="number"]').first().fill('12');
    await page.getByRole('button', { name: 'Record attendance' }).click();

    const reportSelect = page.locator('select').filter({ hasText: 'Weekly Cell Report' });
    if (await reportSelect.isVisible().catch(() => false)) {
      await reportSelect.selectOption({ index: 1 });
      await page.getByRole('button', { name: 'Send report' }).click();
    }
  });

  test('cell prayer board add request', async ({ page, request }) => {
    const headers = await authHeaders(request);
    const branchesRes = await request.get(`${API_URL}/ministry-cells/branches`, { headers });
    const branch = (await branchesRes.json()).find((b: { name: string }) =>
      b.name.includes('E2E Cell'),
    );

    await page.goto('/dashboard/ministry-cells');
    await selectBranch(page, branch.name);
    await openWorkspaceSection(page, 'Connect');
    await expect(page.getByRole('heading', { name: branch.name })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Add request' }).click();
    await page.locator('#prayer-title').fill(prayerTitle);
    await page.locator('#prayer-body').fill('E2E prayer details');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText(prayerTitle)).toBeVisible({ timeout: 15_000 });
    const prayerRow = page.locator('li').filter({ hasText: prayerTitle });
    await prayerRow.getByRole('button', { name: 'Mark praying' }).click();
    await expect(prayerRow.getByText('PRAYING')).toBeVisible({ timeout: 10_000 });
  });

  test('message leader button sends message', async ({ page, request }) => {
    const headers = await authHeaders(request);
    const branchesRes = await request.get(`${API_URL}/ministry-cells/branches`, { headers });
    const branch = (await branchesRes.json()).find((b: { name: string }) =>
      b.name.includes('E2E Cell'),
    );

    await page.goto('/dashboard/ministry-cells');
    await selectBranch(page, branch.name);
    await openWorkspaceSection(page, 'Connect');
    await expect(page.getByRole('heading', { name: branch.name })).toBeVisible({ timeout: 10_000 });

    const messageArea = page.getByPlaceholder('Write a message…');
    await messageArea.fill(`E2E message ${runId}`);
    const sendBtn = page.getByRole('button', { name: 'Send', exact: true });
    await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
    await sendBtn.click();
    await expect(page.getByText(`E2E message ${runId}`)).toBeVisible({ timeout: 15_000 });
  });

  test('analytics tab loads with filters', async ({ page }) => {
    await page.goto('/dashboard/ministry-cells');
    await page.getByRole('button', { name: 'Cell Performance' }).click();
    await expect(page.getByText('Performance filters')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Branch comparison')).toBeVisible({ timeout: 15_000 });
  });

  test.skip('setup: seed forms, teaching manual, reminders', async ({ page }) => {
    // Church-wide forms / Teaching manual / Reminder scheduler cards removed from Branches tab.
    await page.goto('/dashboard/ministry-cells');
    await expect(page.getByRole('heading', { name: 'Church-wide forms' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: 'Seed defaults' }).click();

    await page.getByRole('button', { name: 'Add resource' }).first().click();
    await page.locator('#teach-title').fill(teachingTitle);
    await page.locator('#teach-desc').fill('E2E teaching description');
    await page.locator('#teach-content').fill('E2E lesson content body');
    await page.getByRole('button', { name: 'Add resource' }).last().click();
    const teachCard = page.locator('div.rounded-md.border.p-3').filter({
      has: page.locator('p.font-medium', { hasText: teachingTitle }),
    });
    await expect(teachCard).toBeVisible({ timeout: 15_000 });

    await teachCard.getByRole('button', { name: 'Edit' }).click();
    await page.locator('#teach-title').fill(`${teachingTitle} Edited`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page.locator('p.font-medium', { hasText: `${teachingTitle} Edited` }),
    ).toBeVisible({ timeout: 15_000 });

    page.once('dialog', (dialog) => dialog.accept());
    const editedCard = page.locator('div.rounded-md.border.p-3').filter({
      has: page.locator('p.font-medium', { hasText: `${teachingTitle} Edited` }),
    });
    await editedCard.getByRole('button', { name: 'Delete' }).click();

    await page.getByRole('button', { name: 'Schedule' }).click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const local = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    await page.locator('#rem-title').fill(reminderTitle);
    await page.locator('#rem-at').fill(local);
    await page.getByRole('button', { name: 'Schedule reminder' }).click();
    await expect(page.getByText(reminderTitle)).toBeVisible({ timeout: 15_000 });
  });

  test('branches tab keeps Add New Cell visible', async ({ page }) => {
    await page.goto('/dashboard/ministry-cells');
    await page.getByRole('button', { name: 'Cell Performance' }).click();
    await page.getByRole('button', { name: 'Branches' }).click();
    await expect(page.getByRole('button', { name: 'Add New Cell' })).toBeVisible();
  });

  test('cancel buttons close forms without submitting', async ({ page, request }) => {
    const headers = await authHeaders(request);
    const branchesRes = await request.get(`${API_URL}/ministry-cells/branches`, { headers });
    const branch = (await branchesRes.json()).find((b: { name: string }) =>
      b.name.includes('E2E Cell'),
    );

    await page.goto('/dashboard/ministry-cells');

    // Add New Cell toggle open/close
    await page.getByRole('button', { name: 'Add New Cell' }).click();
    await expect(page.locator('#name')).toBeVisible();
    await page.getByRole('button', { name: 'Add New Cell' }).click();
    await expect(page.locator('#name')).not.toBeVisible();

    // Edit branch cancel
    await selectBranch(page, branch.name);
    await page.getByRole('button', { name: 'Edit branch' }).click();
    await expect(page.locator('#edit-name')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel edit' }).click();
    await expect(page.locator('#edit-name')).not.toBeVisible();

    // Member picker cancel
    await openWorkspaceSection(page, 'Membership Directory');
    await page.getByRole('button', { name: 'Add member' }).click();
    await expect(page.locator('#member-search')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('#member-search')).not.toBeVisible();

    // Prayer form cancel
    await openWorkspaceSection(page, 'Connect');
    await page.getByRole('button', { name: 'Add request' }).click();
    await expect(page.locator('#prayer-title')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('#prayer-title')).not.toBeVisible();

    // Setup tab cancels
    await page.getByRole('button', { name: 'Setup' }).click();
    await page.getByRole('button', { name: 'Add resource' }).first().click();
    await expect(page.locator('#teach-title')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('#teach-title')).not.toBeVisible();

    await page.getByRole('button', { name: 'Schedule' }).click();
    await expect(page.locator('#rem-title')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('#rem-title')).not.toBeVisible();
  });

  test('prayer status buttons: mark answered and closed', async ({ page, request }) => {
    const headers = await authHeaders(request);
    const branchesRes = await request.get(`${API_URL}/ministry-cells/branches`, { headers });
    const branch = (await branchesRes.json()).find((b: { name: string }) =>
      b.name.includes('E2E Cell'),
    );

    const statusPrayer = `E2E Status Prayer ${runId}`;
    await request.post(`${API_URL}/ministry-cells/branches/${branch.id}/prayers`, {
      headers,
      data: { title: statusPrayer, body: 'status flow test' },
    });

    await page.goto('/dashboard/ministry-cells');
    await selectBranch(page, branch.name);
    await openWorkspaceSection(page, 'Connect');
    const row = page.locator('li').filter({ hasText: statusPrayer });
    await expect(row).toBeVisible({ timeout: 10_000 });

    await row.getByRole('button', { name: 'Mark praying' }).click();
    await expect(row.getByText('PRAYING')).toBeVisible({ timeout: 10_000 });

    await row.getByRole('button', { name: 'Mark answered' }).click();
    await expect(row.getByText('ANSWERED')).toBeVisible({ timeout: 10_000 });

    await row.getByRole('button', { name: 'Mark closed' }).click();
    await expect(row.getByText('CLOSED')).toBeVisible({ timeout: 10_000 });
  });

  test('assigned cell leader sees Ministry/Cells in member sidebar', async ({ page, request }) => {
    const headers = await authHeaders(request);
    const candidatesRes = await request.get(`${API_URL}/ministry-cells/leader-candidates`, { headers });
    expect(candidatesRes.ok()).toBeTruthy();
    const memberUser = (await candidatesRes.json()).find(
      (u: { email: string }) => u.email === 'member@demo.church',
    );
    if (!memberUser) {
      test.skip(true, 'Seed user member@demo.church not found');
    }

    const branchRes = await request.post(`${API_URL}/ministry-cells/branches`, {
      headers,
      data: {
        name: `E2E Leader Nav ${runId}`,
        location: 'Sidebar test',
        leaderUserId: memberUser.id,
      },
    });
    expect(branchRes.ok()).toBeTruthy();

    await seedAuth(page, request, { email: 'member@demo.church' });
    await page.goto('/dashboard/lounge');
    await expect(page.getByRole('link', { name: 'Ministry/Cells' })).toBeVisible({
      timeout: 20_000,
    });
  });
});
