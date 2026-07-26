import {
  cellPostcodeMatchesCoverage,
  normalizeUkPostcodeKey,
  sanitizeProvincePostcodeEntry,
  sanitizeUkPostcode,
  UK_POSTCODE_REGEX,
} from '@church-hub/shared-types';
import { BadRequestException } from '@nestjs/common';

/** Require a full UK postcode for cell branches. */
export function requireCellPostcode(value: unknown): string {
  const spaced = sanitizeUkPostcode(value);
  if (!spaced || !UK_POSTCODE_REGEX.test(spaced)) {
    throw new BadRequestException('Enter a valid UK postcode for this cell/ministry');
  }
  return spaced;
}

export function normalizeCoveragePostcodes(raw: unknown[]): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new BadRequestException('Province must include at least one postcode');
  }
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const key = sanitizeProvincePostcodeEntry(item);
    if (!key) {
      throw new BadRequestException(
        `Invalid province postcode "${String(item)}" — use a UK postcode or outward code (e.g. N1)`,
      );
    }
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  if (!keys.length) {
    throw new BadRequestException('Province must include at least one postcode');
  }
  return keys;
}

export function findMatchingProvinceId(
  cellPostcode: string,
  provinces: { id: string; postcodes: string[] }[],
): string | null {
  const matches = provinces.filter((p) =>
    cellPostcodeMatchesCoverage(cellPostcode, p.postcodes),
  );
  if (matches.length > 1) {
    throw new BadRequestException(
      'Cell postcode matches more than one province coverage. Fix overlapping province postcodes.',
    );
  }
  return matches[0]?.id ?? null;
}

export function assertCoverageIncludesCell(cellPostcode: string, coverage: string[]) {
  if (!cellPostcodeMatchesCoverage(cellPostcode, coverage)) {
    throw new BadRequestException(
      'This province coverage does not include the cell postcode. Update coverage or choose another province.',
    );
  }
}

export { normalizeUkPostcodeKey, cellPostcodeMatchesCoverage };
