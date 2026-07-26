import { BadRequestException } from '@nestjs/common';
import {
  CreateCellBranchSchema,
  CreateCellProvinceSchema,
  UpdateCellBranchSchema,
} from '@church-hub/shared-types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { normalizeCoveragePostcodes, requireCellPostcode } from './cell-province.util';

describe('B3 ministry-cells branch/province validation', () => {
  const branchPipe = new ZodValidationPipe(CreateCellBranchSchema);
  const updateBranchPipe = new ZodValidationPipe(UpdateCellBranchSchema);
  const provincePipe = new ZodValidationPipe(CreateCellProvinceSchema);

  it('rejects create branch with missing name → 400', () => {
    expect(() =>
      branchPipe.transform({ name: '  ', postcode: 'N1 1AA' }),
    ).toThrow(BadRequestException);
  });

  it('rejects create branch with invalid postcode → 400', () => {
    expect(() =>
      branchPipe.transform({ name: 'North Cell', postcode: 'NOTAPOSTCODE' }),
    ).toThrow(BadRequestException);
  });

  it('accepts create branch with valid UK postcode', () => {
    const parsed = branchPipe.transform({
      name: 'North Cell',
      postcode: 'n11aa',
      location: 'Islington',
    }) as { name: string; postcode: string; location?: string };
    expect(parsed.name).toBe('North Cell');
    expect(parsed.postcode).toBe('N1 1AA');
    expect(parsed.location).toBe('Islington');
  });

  it('rejects update branch with invalid postcode → 400', () => {
    expect(() =>
      updateBranchPipe.transform({ postcode: 'ZZZZ' }),
    ).toThrow(BadRequestException);
  });

  it('rejects create province with missing name → 400', () => {
    expect(() =>
      provincePipe.transform({
        name: '',
        leaderUserId: 'user_1',
        postcodes: ['N1'],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects create province with invalid postcode → 400', () => {
    expect(() =>
      provincePipe.transform({
        name: 'North London',
        leaderUserId: 'user_1',
        postcodes: ['not-a-code'],
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts create province with outward codes', () => {
    const parsed = provincePipe.transform({
      name: 'North London',
      leaderUserId: 'user_1',
      postcodes: ['n1', 'N2', 'N1'],
    }) as { postcodes: string[] };
    expect(parsed.postcodes).toEqual(['N1', 'N2']);
  });

  it('requireCellPostcode throws on invalid', () => {
    expect(() => requireCellPostcode('nope')).toThrow(BadRequestException);
    expect(requireCellPostcode('SW1A 1AA')).toBe('SW1A 1AA');
  });

  it('normalizeCoveragePostcodes throws on empty/invalid', () => {
    expect(() => normalizeCoveragePostcodes([])).toThrow(BadRequestException);
    expect(() => normalizeCoveragePostcodes(['bad'])).toThrow(BadRequestException);
    expect(normalizeCoveragePostcodes(['N1', 'n1'])).toEqual(['N1']);
  });
});
