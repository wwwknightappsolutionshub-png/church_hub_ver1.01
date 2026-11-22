/**
 * Phase 1 — GET /follow-up/pipeline resolves winners_default for demo church.
 * Run: npx playwright test e2e/pipeline-option-c-phase1-api.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';
import { resetPipelineOptionCDemo } from './helpers/pipeline-option-c';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 1 — resolve API', () => {
  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    await resetPipelineOptionCDemo(request, headers);
  });

  test('GET /follow-up/pipeline returns winners_default template', async ({ request }) => {
    const res = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();

    expect(body.source).toBe('template');
    expect(body.templateKey).toBe('winners_default');
    expect(body.definitionId).toBeNull();
    expect(body.stages).toHaveLength(6);
    expect(body.stages.map((s: { key: string }) => s.key)).toEqual([
      'NEW_LEAD',
      'CONTACTED',
      'VISITED',
      'ATTENDED',
      'JOINED_GROUP',
      'ENLISTED_FOR_BAPTISM',
    ]);

    const entry = body.stages.find((s: { isEntry: boolean }) => s.isEntry);
    expect(entry?.key).toBe('NEW_LEAD');

    const joined = body.stages.find((s: { key: string }) => s.key === 'JOINED_GROUP');
    expect(joined?.blocksArchive).toBe(true);
    expect(joined?.graduatesSla).toBe(true);

    expect(body.phases).toHaveLength(3);
    expect(body.phases.map((p: { key: string }) => p.key)).toEqual([
      'outreach',
      'engagement',
      'belonging',
    ]);
  });

  test('unauthenticated pipeline resolve is rejected', async ({ request }) => {
    const res = await request.get(`${API_URL}/follow-up/pipeline`);
    expect([401, 403]).toContain(res.status());
  });
});
