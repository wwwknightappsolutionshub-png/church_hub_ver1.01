import { describe, expect, it } from 'vitest';
import { auditManifest, auditServiceWorkerSource } from './pwa-checklist';

describe('pwa-checklist', () => {
  it('auditManifest passes valid manifest', () => {
    const r = auditManifest({
      name: 'Church_Hub',
      start_url: '/',
      display: 'standalone',
      icons: [{ src: '/icons/icon.svg' }],
    });
    expect(r.ok).toBe(true);
  });

  it('auditManifest fails incomplete manifest', () => {
    const r = auditManifest({});
    expect(r.ok).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('auditServiceWorkerSource requires handlers', () => {
    expect(auditServiceWorkerSource('install fetch caches').ok).toBe(true);
    expect(auditServiceWorkerSource('empty').ok).toBe(false);
  });

  it('production sw.js passes audit', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sw = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
    expect(auditServiceWorkerSource(sw).ok).toBe(true);
    expect(sw).toContain('/offline');
  });
});
