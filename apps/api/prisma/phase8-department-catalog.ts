import { DepartmentCode } from '@prisma/client';

/** Phase 8 outline departments — mapped to service unit names. */
export const PHASE8_DEPARTMENT_CODES: DepartmentCode[] = [
  'USHERING',
  'CHOIR',
  'EVANGELISM',
  'YOUTH',
  'TEENS',
  'CHILDREN',
  'PROTOCOL',
  'PRAYER',
  'MEDIA',
  'MEDICAL',
];

export const PHASE8_UNIT_NAME_BY_CODE: Record<DepartmentCode, string> = {
  USHERING: 'Ushering',
  CHOIR: 'Choir',
  EVANGELISM: 'Harvesters Squad',
  YOUTH: 'Youth Ministry',
  TEENS: "Teens' Church",
  CHILDREN: "Children's Church Teachers",
  PROTOCOL: 'Protocol',
  PRAYER: 'Prayer Squad',
  MEDIA: 'Media',
  MEDICAL: 'Medical',
  OTHER: 'General Ministry',
};

export const PHASE8_NAME_TO_CODE: Record<string, DepartmentCode> = Object.fromEntries(
  Object.entries(PHASE8_UNIT_NAME_BY_CODE).map(([code, name]) => [name, code as DepartmentCode]),
) as Record<string, DepartmentCode>;

export const PHASE8_EXTRA_UNITS: Array<{
  name: string;
  departmentCode: DepartmentCode;
  description: string;
  activities: string;
}> = [
  {
    name: 'Youth Ministry',
    departmentCode: 'YOUTH',
    description: 'Coordinate youth programmes and volunteer engagement.',
    activities: 'Youth events, leader coordination, attendance, parent liaison.',
  },
];
