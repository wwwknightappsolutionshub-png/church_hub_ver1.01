const IMAGE_RE = /^\/images\/blog\/[a-z0-9-]+\.(svg|webp|png)$/;

export function safeCoverPath(path: string): string {
  return IMAGE_RE.test(path) ? path : '/images/blog/about-church-hub.svg';
}
