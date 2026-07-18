const STORAGE_KEY = 'churchHub.lastChurchSlug';

export function churchPublicPath(slug: string): string {
  return `/c/${encodeURIComponent(slug)}`;
}

/** URL-safe slug from a church display name (e.g. "Grace Community" → "grace-community"). */
export function slugifyChurchName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'church';
}

/** Optional cache-bust query after CMS saves (forces fresh HTML even with an old service worker). */
export function churchPublicPreviewPath(slug: string, version?: number): string {
  const base = churchPublicPath(slug);
  return version != null ? `${base}?v=${version}` : base;
}

export function getLastChurchSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const slug = localStorage.getItem(STORAGE_KEY);
  return slug?.trim() || null;
}

export function setLastChurchSlug(slug: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  if (!slug?.trim()) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, slug.trim());
}

export function churchHomePath(slug?: string | null): string {
  const resolved = slug?.trim() || getLastChurchSlug();
  return resolved ? churchPublicPath(resolved) : '/';
}
