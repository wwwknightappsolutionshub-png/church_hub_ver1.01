const ALLOWED = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'br']);
const RELATIVE_HREF = /^\/[a-zA-Z0-9/_?-]+$/;
const HTTPS_HREF = /^https:\/\/[a-z0-9.-]{1,253}(?:\/[a-zA-Z0-9._~%-]*)*\/?$/;

function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (href.length > 300) return null;
  if (/[\u0000-\u001f\u007f\\&<>"'`]/.test(href)) return null;
  if (href.includes('//') && !href.startsWith('https://')) return null;
  if (RELATIVE_HREF.test(href)) return href;
  if (HTTPS_HREF.test(href)) return href;
  return null;
}

/** Keep a small set of tags. Drop scripts, handlers, and odd links before a page is stored. */
export function sanitizeGuideHtml(input: string): string {
  const stripped = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const rebuilt = stripped.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED.has(tag)) return '';
    if (full.startsWith('</')) return tag === 'br' ? '' : `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const match = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      const href = safeHref(match?.[2] ?? match?.[3] ?? '');
      if (!href) return '<a>';
      const external = href.startsWith('https://') ? ' rel="noopener noreferrer"' : '';
      return `<a href="${href}"${external}>`;
    }
    return `<${tag}>`;
  });
  return rebuilt.replace(/<(?!\/?(?:p|h2|h3|ul|ol|li|a|strong|em|br)(?:\s|>))/gi, '&lt;');
}

export function plainGuideText(value: string, max: number): string {
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim().slice(0, max);
}

export function paragraphsToHtml(paragraphs: string[]): string {
  return paragraphs
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (trimmed.startsWith('## ')) return `<h2>${escapeText(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith('### ')) return `<h3>${escapeText(trimmed.slice(4))}</h3>`;
      return `<p>${escapeText(trimmed)}</p>`;
    })
    .join('');
}

export function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function countWords(htmlOrText: string): number {
  const text = htmlOrText.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_RE = /^\/images\/blog\/[a-z0-9-]+\.(svg|webp|png)$/;

export function parseGuideSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length > 80) {
    throw new Error('Use a short slug made of lowercase words and hyphens');
  }
  return slug;
}

export function parseCoverImagePath(value: string): string {
  const path = value.trim();
  if (!IMAGE_RE.test(path)) {
    throw new Error('Cover image must be a file under /images/blog');
  }
  return path;
}

export function publicCoverPath(value: string | null | undefined): string {
  if (!value || !IMAGE_RE.test(value)) return '/images/blog/about-church-hub.svg';
  return value;
}
