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

/** Second check at render time, matching the API cleaner. */
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

/** JSON inside a script tag. Angle brackets stay as text, not markup. */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function safeArticleSlug(slug: string): string | null {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80 ? slug : null;
}
