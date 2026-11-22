/**
 * Phase 7 — bump → diff; merge happy path; conflict take_template.
 * Run: npx playwright test e2e/pipeline-option-c-phase7-api.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 7 — diff + merge', () => {
  let headers: Record<string, string>;
  const customKey = `P7_CUSTOM_${String(Date.now()).slice(-6)}`;
  const addedKey = `P7_ADDED_${String(Date.now()).slice(-6)}`;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    // Fresh fork from simple_visitor for predictable stage set
    await request.post(`${API_URL}/follow-up/pipeline/discard`, { headers, data: {} });
    await request.put(`${API_URL}/follow-up/pipeline/base-template`, {
      headers,
      data: { templateKey: 'simple_visitor' },
    });
    await request.post(`${API_URL}/follow-up/pipeline/fork`, {
      headers,
      data: { templateKey: 'simple_visitor' },
    });
    await request.post(`${API_URL}/follow-up/pipeline/stages`, {
      headers,
      data: { key: customKey, label: 'Phase 7 Custom' },
    });
  });

  test('bump adding a stage → updates available with added diff', async ({ request }) => {
    const bump = await request.post(
      `${API_URL}/follow-up/pipeline/templates/simple_visitor/bump`,
      {
        headers,
        data: {
          stages: [
            {
              key: addedKey,
              label: 'Phase 7 Added Stage',
              shortLabel: 'Added',
              phaseKey: 'belonging',
              phaseStep: 3,
              phaseTitle: 'Belonging & Discipleship',
              colorToken: 'emerald',
            },
          ],
        },
      },
    );
    expect(bump.ok(), await bump.text()).toBeTruthy();
    const bumped = await bump.json();
    expect(bumped.version).toBeGreaterThan(1);
    expect(bumped.stageKeys).toContain(addedKey);

    const updates = await request.get(`${API_URL}/follow-up/pipeline/updates`, { headers });
    expect(updates.ok(), await updates.text()).toBeTruthy();
    const body = await updates.json();
    expect(body.updatesAvailable).toBe(true);
    expect(body.diff.added.map((s: { key: string }) => s.key)).toContain(addedKey);
    expect(body.diff.custom.map((s: { key: string }) => s.key)).toContain(customKey);
  });

  test('merge happy path adds template stage and preserves custom', async ({ request }) => {
    const merge = await request.post(`${API_URL}/follow-up/pipeline/merge`, {
      headers,
      data: { resolveConflicts: {} },
    });
    expect(merge.ok(), await merge.text()).toBeTruthy();
    const body = await merge.json();
    expect(body.pipeline.source).toBe('definition');
    const keys = body.pipeline.stages.map((s: { key: string }) => s.key);
    expect(keys).toContain(addedKey);
    expect(keys).toContain(customKey);
    expect(body.updates.updatesAvailable).toBe(false);
    expect(body.pipeline.stages.find((s: { key: string }) => s.key === customKey)?.label).toBe(
      'Phase 7 Custom',
    );
  });

  test('conflict: church label vs template bump → take_template', async ({ request }) => {
    const patch = await request.patch(`${API_URL}/follow-up/pipeline/stages/NEW_LEAD`, {
      headers,
      data: { label: 'Church Fresh Name', shortLabel: 'Church' },
    });
    expect(patch.ok(), await patch.text()).toBeTruthy();

    const bump = await request.post(
      `${API_URL}/follow-up/pipeline/templates/simple_visitor/bump`,
      {
        headers,
        data: {
          stages: [{ key: 'NEW_LEAD', label: 'Template Fresh Name', shortLabel: 'Template' }],
        },
      },
    );
    expect(bump.ok(), await bump.text()).toBeTruthy();
    const bumped = await bump.json();
    const bumpedLead = bumped.stages.find((s: { key: string }) => s.key === 'NEW_LEAD');
    expect(bumpedLead?.label).toBe('Template Fresh Name');

    const updates = await request.get(`${API_URL}/follow-up/pipeline/updates`, { headers });
    const u = await updates.json();
    expect(u.updatesAvailable).toBe(true);
    expect(u.diff.conflicts.map((c: { key: string }) => c.key)).toContain('NEW_LEAD');
    const conflict = u.diff.changed.find((c: { key: string }) => c.key === 'NEW_LEAD');
    expect(conflict.church.label).toBe('Church Fresh Name');
    expect(conflict.template.label).toBe('Template Fresh Name');

    const merge = await request.post(`${API_URL}/follow-up/pipeline/merge`, {
      headers,
      data: { resolveConflicts: { NEW_LEAD: 'take_template' } },
    });
    expect(merge.ok(), await merge.text()).toBeTruthy();
    const body = await merge.json();
    expect(body.applied, JSON.stringify(body)).toEqual(
      expect.arrayContaining(['took_template:NEW_LEAD']),
    );
    const lead = body.pipeline.stages.find((s: { key: string }) => s.key === 'NEW_LEAD');
    expect(lead.label).toBe('Template Fresh Name');
  });

  test('dismiss clears updatesAvailable until next bump', async ({ request }) => {
    await request.post(`${API_URL}/follow-up/pipeline/templates/simple_visitor/bump`, {
      headers,
      data: {},
    });
    const before = await (await request.get(`${API_URL}/follow-up/pipeline/updates`, { headers })).json();
    expect(before.updatesAvailable).toBe(true);

    const dismiss = await request.post(`${API_URL}/follow-up/pipeline/updates/dismiss`, {
      headers,
      data: {},
    });
    expect(dismiss.ok(), await dismiss.text()).toBeTruthy();
    const after = await dismiss.json();
    expect(after.updatesAvailable).toBe(false);
  });
});
