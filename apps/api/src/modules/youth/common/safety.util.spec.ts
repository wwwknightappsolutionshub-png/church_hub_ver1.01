import { scanYouthContent, scanContentForModeration } from './safety.util';

describe('scanYouthContent', () => {
  it('flags harmful keywords', () => {
    expect(scanYouthContent('this is hate speech')).toMatch(/hate/);
  });

  it('allows clean content in non-strict mode', () => {
    expect(
      scanYouthContent('call me at 555-123-4567', { strictSafeMode: false }),
    ).toBeNull();
  });

  it('blocks phone numbers in strict mode', () => {
    expect(scanYouthContent('call me at 555-123-4567')).toMatch(/phone/);
  });

  it('blocks external links in strict mode', () => {
    expect(scanYouthContent('see https://evil.example')).toMatch(/link/);
  });

  it('scanContentForModeration skips strict patterns', () => {
    expect(scanContentForModeration('https://ok.com')).toBeNull();
  });
});
