import { DepartmentCode } from '@prisma/client';
import { PHASE8_NAME_TO_CODE } from './phase8-department-catalog';

/** Department modules with full dept-tools UI + API. */
export const DEPT_MODULE_CODES = [
  'MEDICAL',
  'MEDIA',
  'CHILDREN',
  'CHOIR',
  'PRAYER',
  'USHERING',
  'EVANGELISM',
  'YOUTH',
  'TEENS',
  'PROTOCOL',
] as const satisfies readonly DepartmentCode[];

export const DEPT_MODULE_LABEL: Record<string, string> = {
  MEDICAL: 'Medical',
  MEDIA: 'Media',
  CHILDREN: "Children's Church Teachers",
  CHOIR: 'Choir',
  PRAYER: 'Prayer Squad',
  USHERING: 'Ushering',
  EVANGELISM: 'Harvesters Squad',
  YOUTH: 'Youth Ministry',
  TEENS: "Teens' Church",
  PROTOCOL: 'Protocol',
};

export function isDeptModuleCode(
  code: DepartmentCode | null | undefined,
): code is (typeof DEPT_MODULE_CODES)[number] {
  return !!code && (DEPT_MODULE_CODES as readonly DepartmentCode[]).includes(code);
}

/** Resolve module code from stored enum or catalog unit name (e.g. "Choir" → CHOIR). */
export function resolveDeptModuleCode(
  departmentCode: DepartmentCode | null | undefined,
  unitName: string,
): (typeof DEPT_MODULE_CODES)[number] | null {
  if (isDeptModuleCode(departmentCode)) return departmentCode;
  const fromName = PHASE8_NAME_TO_CODE[unitName];
  if (isDeptModuleCode(fromName)) return fromName;

  const norm = unitName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const aliases: Record<string, DepartmentCode> = {
    'youth mistry': 'YOUTH',
    'youth ministry': 'YOUTH',
    'teens church': 'TEENS',
    'teens church teachers': 'TEENS',
    'harvesters squad': 'EVANGELISM',
  };
  const alias = aliases[norm];
  if (isDeptModuleCode(alias)) return alias;

  for (const [name, code] of Object.entries(PHASE8_NAME_TO_CODE)) {
    const n = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    if (n === norm && isDeptModuleCode(code)) return code;
  }
  return null;
}
