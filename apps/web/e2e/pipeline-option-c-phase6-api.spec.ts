/**
 * Phase 6 — list templates, select base (pre-fork), fork from simple_visitor.
 * Run: npx playwright test e2e/pipeline-option-c-phase6-api.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';
import { resetPipelineOptionCDemo } from './helpers/pipeline-option-c';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 6 — templates + select', () => {
  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    // Discard fork + resync seed stages (prunes Phase 7 QA bumps)
    await resetPipelineOptionCDemo(request, headers);
  });

  test('list templates includes winners_default and simple_visitor', async ({ request }) => {
    const res = await request.get(`${API_URL}/follow-up/pipeline/templates`, { headers });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.forked).toBe(false);
    const keys = body.templates.map((t: { key: string }) => t.key);
    expect(keys).toEqual(expect.arrayContaining(['winners_default', 'simple_visitor']));
    const simple = body.templates.find((t: { key: string }) => t.key === 'simple_visitor');
    expect(simple.stageCount).toBe(4);
    expect(simple.stageKeys).toEqual(['NEW_LEAD', 'CONTACTED', 'VISITED', 'JOINED_GROUP']);
  });

  test('select simple_visitor updates resolve before fork', async ({ request }) => {
    const put = await request.put(`${API_URL}/follow-up/pipeline/base-template`, {
      headers,
      data: { templateKey: 'simple_visitor' },
    });
    expect(put.ok(), await put.text()).toBeTruthy();
    const resolved = await put.json();
    expect(resolved.source).toBe('template');
    expect(resolved.templateKey).toBe('simple_visitor');
    expect(resolved.stages).toHaveLength(4);
    expect(resolved.stages.map((s: { key: string }) => s.key)).not.toContain('ATTENDED');

    const get = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    const body = await get.json();
    expect(body.templateKey).toBe('simple_visitor');
    expect(body.source).toBe('template');
  });

  test('fork from preferred simple_visitor creates definition', async ({ request }) => {
    const fork = await request.post(`${API_URL}/follow-up/pipeline/fork`, {
      headers,
      data: {},
    });
    expect(fork.ok(), await fork.text()).toBeTruthy();
    const body = await fork.json();
    expect(body.source).toBe('definition');
    expect(body.templateKey).toBe('simple_visitor');
    expect(body.stages).toHaveLength(4);

    const blocked = await request.put(`${API_URL}/follow-up/pipeline/base-template`, {
      headers,
      data: { templateKey: 'winners_default' },
    });
    expect(blocked.status()).toBe(400);
  });
});
