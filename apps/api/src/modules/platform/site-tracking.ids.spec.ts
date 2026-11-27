import { parseSiteTrackingId, parseSiteTrackingPatch, sanitizeSiteTrackingIds } from './site-tracking.ids';

describe('site tracking ids', () => {
  it('accepts the Church_Hub Tag Manager and Analytics IDs', () => {
    expect(parseSiteTrackingId('GTM-WXVNRGZ8', /^GTM-[A-Z0-9]{4,20}$/, 'container')).toBe(
      'GTM-WXVNRGZ8',
    );
    expect(parseSiteTrackingId('G-LRQXN7591Q', /^G-[A-Z0-9]{4,20}$/, 'measurement')).toBe(
      'G-LRQXN7591Q',
    );
  });

  it('clears a blank field and rejects a pasted script', () => {
    expect(
      parseSiteTrackingPatch({ gtmContainerId: '  ', facebookPixelId: '1234567890' }),
    ).toEqual({
      gtmContainerId: null,
      facebookPixelId: '1234567890',
    });
    expect(() =>
      parseSiteTrackingPatch({ gtmContainerId: '<script>alert(1)</script>' }),
    ).toThrow(/must be an ID/);
    expect(() => parseSiteTrackingPatch({ gaMeasurementId: 'UA-123' })).toThrow(/Invalid/);
  });

  it('drops a stored value that could break out of a script tag', () => {
    expect(
      sanitizeSiteTrackingIds({
        gtmContainerId: "GTM-TEST');alert(1)//",
        gaMeasurementId: 'G-LRQXN7591Q',
        facebookPixelId: '123<script>',
        googleSiteVerification: 'token"onload=1',
      }),
    ).toEqual({
      gtmContainerId: null,
      gaMeasurementId: 'G-LRQXN7591Q',
      facebookPixelId: null,
      googleSiteVerification: null,
    });
  });
});
