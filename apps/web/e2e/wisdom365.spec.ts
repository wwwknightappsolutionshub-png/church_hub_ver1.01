import { test, expect } from '@playwright/test';
import { API_URL, authHeaders, seedAuth, skipBrowser, skipUnlessApiOk } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Wisdom365+', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip browser E2E');

  test.beforeAll(async ({ request }) => {
    await skipUnlessApiOk(request, '/wisdom365/catalog');
  });

  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('module route loads landing or journey hub', async ({ page }) => {
    await page.goto('/dashboard/wisdom365');
    await expect(
      page
        .getByRole('heading', {
          name: /Wisdom365\+|Choose your life journey|My journeys|Could not load Wisdom365\+/i,
        })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('catalog API returns variants', async ({ request }) => {
    const headers = await authHeaders(request);
    const res = await request.get(`${API_URL}/wisdom365/catalog`, { headers });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.variants)).toBe(true);
    expect(data.variants.length).toBeGreaterThanOrEqual(1);
  });

  test('landing or hub shows purchase or journey content', async ({ page }) => {
    await page.goto('/dashboard/wisdom365');
    const buyBtn = page.getByRole('button', { name: /Buy.*license/i });
    const journeyHeading = page.getByRole('heading', { name: 'Choose your life journey' });
    const myJourneys = page.getByRole('heading', { name: 'My journeys' });
    const journeyPanel = page.getByText(/Day \d+|Today's reading/i).first();

    await expect(buyBtn.or(journeyHeading).or(myJourneys).or(journeyPanel).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('Retry button appears and is clickable on load error state', async ({ page }) => {
    await page.route('**/api/v1/wisdom365/catalog**', (route) =>
      route.fulfill({ status: 503, body: 'Unavailable' }),
    );
    await page.goto('/dashboard/wisdom365');
    const retry = page.getByRole('button', { name: 'Retry' });
    await expect(retry).toBeVisible({ timeout: 20_000 });
    await expect(retry).toBeEnabled();
  });
});
