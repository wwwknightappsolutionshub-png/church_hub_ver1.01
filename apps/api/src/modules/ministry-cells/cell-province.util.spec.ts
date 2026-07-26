import {
  cellPostcodeMatchesCoverage,
  isUkOutwardOnlyPostcode,
  normalizeUkPostcodeKey,
  sanitizeProvincePostcodeEntry,
  ukPostcodeOutward,
} from '@church-hub/shared-types';

describe('cell province postcode matching', () => {
  it('matches full postcode equality', () => {
    expect(cellPostcodeMatchesCoverage('N1 1AA', ['N11AA'])).toBe(true);
    expect(cellPostcodeMatchesCoverage('N1 1AA', ['N1 1AA'])).toBe(true);
  });

  it('matches outward-only coverage', () => {
    expect(cellPostcodeMatchesCoverage('N1 1AA', ['N1'])).toBe(true);
    expect(cellPostcodeMatchesCoverage('N1 9ZZ', ['N1'])).toBe(true);
    expect(cellPostcodeMatchesCoverage('N2 1AA', ['N1'])).toBe(false);
  });

  it('does not match different full postcodes by outward alone', () => {
    expect(cellPostcodeMatchesCoverage('N1 1AA', ['N12BB'])).toBe(false);
  });

  it('normalizes and detects outward-only entries', () => {
    expect(normalizeUkPostcodeKey('n1 1aa')).toBe('N11AA');
    expect(isUkOutwardOnlyPostcode('N1')).toBe(true);
    expect(isUkOutwardOnlyPostcode('N1 1AA')).toBe(false);
    expect(ukPostcodeOutward('N1 1AA')).toBe('N1');
    expect(sanitizeProvincePostcodeEntry('n1')).toBe('N1');
    expect(sanitizeProvincePostcodeEntry('N1 1AA')).toBe('N11AA');
    expect(sanitizeProvincePostcodeEntry('not-a-code')).toBe('');
  });
});
