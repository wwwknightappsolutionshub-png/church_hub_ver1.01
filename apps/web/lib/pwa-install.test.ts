import { describe, expect, it } from 'vitest';
import { auditManifest } from '@/lib/pwa-checklist';
import {
  isMarketingPath,
  isPublicWebFormPath,
  shouldShowPwaInstallGate,
} from '@/lib/pwa-install';

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

describe('public web form paths', () => {
  it('treats outreach capture as browser-only', () => {
    expect(isPublicWebFormPath('/outreach/capture')).toBe(true);
    expect(isPublicWebFormPath('/outreach/capture/')).toBe(true);
    expect(isPublicWebFormPath('/dashboard/outreach')).toBe(false);
    expect(isPublicWebFormPath('/')).toBe(false);
  });
});

describe('marketing paths', () => {
  it('includes landing and auth pages for exit intent', () => {
    expect(isMarketingPath('/')).toBe(true);
    expect(isMarketingPath('/register')).toBe(true);
    expect(isMarketingPath('/login')).toBe(true);
    expect(isMarketingPath('/legal/privacy-policy')).toBe(true);
    expect(isMarketingPath('/dashboard')).toBe(false);
  });
});

describe('install gate visibility', () => {
  it('does not auto-block first visit in SSR', () => {
    expect(shouldShowPwaInstallGate()).toBe(false);
  });
});
