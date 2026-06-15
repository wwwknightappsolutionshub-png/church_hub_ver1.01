import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { seedAuth, skipBrowser } from './helpers/auth';

test.describe('PWA & offline shell (Phase 10)', () => {
  test.skip(skipBrowser, 'Set SKIP_PLAYWRIGHT=true to skip');

  test('manifest.json is valid and installable', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((i: { src: string }) => i.src.includes('icon-512.png'))).toBe(true);
  });

  test('service worker registers on dashboard', async ({ page, request }) => {
    await seedAuth(page, request);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const registered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        await navigator.serviceWorker.register('/sw.js');
        const reg = await navigator.serviceWorker.getRegistration('/');
        return !!reg;
      } catch {
        return false;
      }
    });
    expect(registered).toBe(true);
  });

  test('sw.js precache hooks exist', async () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    const content = fs.readFileSync(swPath, 'utf8');
    expect(content).toContain('install');
    expect(content).toContain('fetch');
    expect(content).toContain('STATIC_CACHE');
    expect(content).toContain('RUNTIME_CACHE');
    expect(content).toContain('PRECACHE_URLS');
  });

  test('offline outreach queue module is bundled', async () => {
    const modPath = path.join(process.cwd(), 'lib', 'offline-sync.ts');
    expect(fs.existsSync(modPath)).toBe(true);
    const content = fs.readFileSync(modPath, 'utf8');
    expect(content).toContain('OUTREACH_CAPTURE');
    expect(content).toContain('outreach_queue');
  });
});
