/**
 * Base URL for server-side fetches (SSR / RSC). Prefer SERVER_API_URL in production
 * (e.g. http://api:4000) so the web container can reach the API without relying
 * on NEXT_PUBLIC_* baked at build time.
 */
export function getServerApiBaseUrl(): string {
  const raw =
    process.env.SERVER_API_URL ??
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000';
  return raw.replace(/\/$/, '');
}
