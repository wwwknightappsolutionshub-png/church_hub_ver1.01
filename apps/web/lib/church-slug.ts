const STORAGE_KEY = 'churchHub.lastChurchSlug';

export function churchPublicPath(slug: string): string {
  return `/c/${encodeURIComponent(slug)}`;
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
