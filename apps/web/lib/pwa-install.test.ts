import { describe, expect, it } from 'vitest';
import { auditManifest } from '@/lib/pwa-checklist';

describe('pwa manifest icons', () => {
  it('includes required PNG sizes for install', () => {
    const manifest = {
      name: 'Church_Hub',
      start_url: '/',
      display: 'standalone',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    };
    expect(auditManifest(manifest).ok).toBe(true);
  });
});
