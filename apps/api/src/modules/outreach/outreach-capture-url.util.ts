/**
 * Public origin used in QR / NFC capture links (phones open this URL).
 * Prefer the live brand domain over legacy infra hosts.
 */
const LEGACY_PUBLIC_HOSTS = new Set([
  'church-hub.wazconnect.com',
  'www.church-hub.wazconnect.com',
]);

const DEFAULT_PUBLIC_APP_URL = 'https://church-hub.online';

export function resolveOutreachCaptureBaseUrl(
  configured?: string | null,
  requestOrigin?: string | null,
): string {
  const candidates = [requestOrigin, configured, DEFAULT_PUBLIC_APP_URL];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
      if (LEGACY_PUBLIC_HOSTS.has(url.hostname.toLowerCase())) {
        return DEFAULT_PUBLIC_APP_URL;
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      return `${url.protocol}//${url.host}`;
    } catch {
      continue;
    }
  }
  return DEFAULT_PUBLIC_APP_URL;
}

export function buildOutreachCaptureUrl(baseUrl: string, code: string): string {
  const origin = resolveOutreachCaptureBaseUrl(baseUrl);
  return `${origin}/outreach/capture?code=${encodeURIComponent(code)}`;
}
