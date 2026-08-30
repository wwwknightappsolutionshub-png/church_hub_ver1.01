import {
  buildCmsSummary,
  DEFAULT_CMS_CONTENT_REVISION,
  DEFAULT_CMS_PAGES,
  parseCmsPublicSummary,
  parseCmsRevision,
} from './platform-cms-defaults';

describe('platform-cms-defaults', () => {
  it('includes Church Hub legal pages with current revision', () => {
    expect(DEFAULT_CMS_PAGES.map((p) => p.slug)).toEqual([
      'privacy-policy',
      'terms-of-service',
      'cookie-policy',
      'data-processing-addendum',
    ]);
    for (const page of DEFAULT_CMS_PAGES) {
      expect(page.contentRevision).toBe(DEFAULT_CMS_CONTENT_REVISION);
      expect(page.htmlBody).toContain('Church Hub');
      expect(page.htmlBody).not.toContain('replace this draft');
    }
  });

  it('round-trips revision in summary prefix', () => {
    const encoded = buildCmsSummary('How we use cookies.', 2);
    expect(parseCmsRevision(encoded)).toBe(2);
    expect(parseCmsPublicSummary(encoded)).toBe('How we use cookies.');
  });
});
