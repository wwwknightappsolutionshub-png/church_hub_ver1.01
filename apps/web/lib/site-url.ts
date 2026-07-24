/** Absolute site origin for Open Graph / canonical URLs. */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    'https://church-hub.wazconnect.com';
  return raw.replace(/\/$/, '');
}
