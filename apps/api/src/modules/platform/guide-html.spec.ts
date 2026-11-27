import { GUIDE_SEED, guideBodyHtml } from './guide-copy';
import { countWords, parseCoverImagePath, parseGuideSlug, plainGuideText, sanitizeGuideHtml } from './guide-html';

describe('guide html', () => {
  it('strips markup from a title before it is shown', () => {
    expect(plainGuideText('<img src=x onerror=alert(1)>Hello', 180)).toBe('Hello');
    expect(plainGuideText('a</script><script>alert(1)', 180)).not.toContain('<');
  });

  it('drops a heading handler and a broken image', () => {
    const clean = sanitizeGuideHtml('<h2 onclick=alert(1)>Title</h2><img src=x onerror=alert(1)><p>ok</p>');
    expect(clean).toBe('<h2>Title</h2><p>ok</p>');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onclick');
  });

  it('drops a script and a javascript link', () => {
    const clean = sanitizeGuideHtml(
      '<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="/register">Start</a>',
    );
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('<a href="/register">');
    expect(clean).toContain('<p>Hello</p>');
  });

  it('rejects links that break out of the address', () => {
    const encoded = sanitizeGuideHtml('<a href="/register&#34; onclick=alert(1)">x</a>');
    const slashes = sanitizeGuideHtml('<a href="///evil.example">x</a>');
    const backslash = sanitizeGuideHtml('<a href="/\\evil.example">x</a>');
    const image = sanitizeGuideHtml('<img src=x onerror=alert(1)><p>ok</p>');
    expect(encoded).not.toContain('onclick');
    expect(encoded).not.toContain('&#');
    expect(slashes).not.toContain('evil');
    expect(backslash).not.toContain('evil');
    expect(image).not.toContain('onerror');
    expect(image).toContain('<p>ok</p>');
  });

  it('accepts a blog image path and rejects an outside address', () => {
    expect(parseCoverImagePath('/images/blog/church-management-software.svg')).toBe(
      '/images/blog/church-management-software.svg',
    );
    expect(() => parseCoverImagePath('https://evil.example/a.svg')).toThrow(/Cover image/);
    expect(() => parseGuideSlug('Church Management')).toThrow(/slug/);
  });

  it('counts words after tags are removed', () => {
    expect(countWords('<p>one two three</p>')).toBe(3);
  });

  it('keeps the about page and each article long enough to be useful', () => {
    const about = GUIDE_SEED.find((page) => page.kind === 'ABOUT');
    expect(about).toBeTruthy();
    const aboutWords = countWords(
      `${guideBodyHtml(about!.paragraphs)} ${about!.faqs.map((faq) => `${faq.question} ${faq.answer}`).join(' ')}`,
    );
    expect(aboutWords).toBeGreaterThanOrEqual(1000);
    const posts = GUIDE_SEED.filter((page) => page.kind === 'POST');
    expect(posts).toHaveLength(5);
    const short = posts
      .map((page) => ({
        slug: page.slug,
        words: countWords(
          `${guideBodyHtml(page.paragraphs)} ${page.faqs.map((faq) => `${faq.question} ${faq.answer}`).join(' ')}`,
        ),
      }))
      .filter((page) => page.words < 1500);
    expect(short).toEqual([]);
  });
});
