import { resolveDeptModuleCode } from '../../../prisma/dept-module-catalog';
import { DepartmentAccessService } from './department-access.service';

describe('DepartmentAccessService', () => {
  it('exposes five department module codes', () => {
    expect(DepartmentAccessService.moduleCodes()).toEqual([
      'MEDICAL',
      'MEDIA',
      'CHILDREN',
      'CHOIR',
      'PRAYER',
    ]);
  });

  it('resolveDeptModuleCode maps unit name when enum missing', () => {
    expect(resolveDeptModuleCode(null, 'Choir')).toBe('CHOIR');
    expect(resolveDeptModuleCode(undefined, "Children's Church Teachers")).toBe('CHILDREN');
  });
});
