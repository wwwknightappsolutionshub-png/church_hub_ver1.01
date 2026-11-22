/**
 * Phase 5 — fork, rename, add stage; resolve returns church definition.
 * Run: npx playwright test e2e/pipeline-option-c-phase5-api.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 5 — fork + edit', () => {
  let headers: Record<string, string>;
  const customKey = `P5_CUSTOM_${String(Date.now()).slice(-6)}`;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
  });

  test('fork is idempotent and returns definition source', async ({ request }) => {
    const first = await request.post(`${API_URL}/follow-up/pipeline/fork`, {
      headers,
      data: {},
    });
    expect(first.ok(), await first.text()).toBeTruthy();
    const a = await first.json();
    expect(a.source).toBe('definition');
    expect(a.definitionId).toBeTruthy();
    expect(a.stages.map((s: { key: string }) => s.key)).toContain('NEW_LEAD');

    const second = await request.post(`${API_URL}/follow-up/pipeline/fork`, {
      headers,
      data: {},
    });
    expect(second.ok(), await second.text()).toBeTruthy();
    const b = await second.json();
    expect(b.definitionId).toBe(a.definitionId);
    expect(b.source).toBe('definition');
  });

  test('rename stage label updates resolve payload', async ({ request }) => {
    const label = `New Contacts P5 ${Date.now().toString().slice(-4)}`;
    const patch = await request.patch(`${API_URL}/follow-up/pipeline/stages/NEW_LEAD`, {
      headers,
      data: { label, shortLabel: 'Fresh P5' },
    });
    expect(patch.ok(), await patch.text()).toBeTruthy();
    const body = await patch.json();
    expect(body.source).toBe('definition');
    const stage = body.stages.find((s: { key: string }) => s.key === 'NEW_LEAD');
    expect(stage.label).toBe(label);

    const resolve = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    expect(resolve.ok()).toBeTruthy();
    const resolved = await resolve.json();
    expect(resolved.source).toBe('definition');
    expect(resolved.stages.find((s: { key: string }) => s.key === 'NEW_LEAD')?.label).toBe(label);
  });

  test('add custom stage key', async ({ request }) => {
    const add = await request.post(`${API_URL}/follow-up/pipeline/stages`, {
      headers,
      data: { key: customKey, label: 'Phase 5 Custom Touch' },
    });
    expect(add.ok(), await add.text()).toBeTruthy();
    const body = await add.json();
    expect(body.stages.map((s: { key: string }) => s.key)).toContain(customKey);
    const custom = body.stages.find((s: { key: string }) => s.key === customKey);
    expect(custom.label).toBe('Phase 5 Custom Touch');
    expect(custom.isEntry).toBe(false);
  });

  test('reject invalid stage key', async ({ request }) => {
    const bad = await request.post(`${API_URL}/follow-up/pipeline/stages`, {
      headers,
      data: { key: 'lowercase', label: 'Nope' },
    });
    expect(bad.status()).toBe(400);
  });
});
