export const DEPT_MODULE_CODES = ['MEDICAL', 'MEDIA', 'CHILDREN', 'CHOIR', 'PRAYER'] as const;

export type DeptModuleCode = (typeof DEPT_MODULE_CODES)[number];

export interface DeptModuleAccessDto {
  canManage: boolean;
  canParticipate: boolean;
  canSubmit: boolean;
  canDelete: boolean;
}

export interface DeptModuleContextDto {
  unit: {
    id: string;
    name: string;
    departmentCode: DeptModuleCode;
    departmentLabel: string;
  };
  access: DeptModuleAccessDto;
}
