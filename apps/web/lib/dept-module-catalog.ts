import { SERVICE_UNIT_CATALOG } from '@/lib/service-unit-catalog';

const CATALOG_UNIT_NAMES = new Set(SERVICE_UNIT_CATALOG.map((u) => u.name));

/**
 * Catalog units that use the legacy department workspace (Home + Reports + Feedbacks)
 * instead of the full Phase 8 department module panel.
 */
export const LEGACY_DEPARTMENT_WORKSPACE_UNITS = new Set([
  'Elders Team',
  'Harvesters Squad',
  'Follow-up',
]);

export function usesLegacyDepartmentWorkspace(unitName: string): boolean {
  return LEGACY_DEPARTMENT_WORKSPACE_UNITS.has(unitName.trim());
}

export const DEPT_MODULE_CODES = new Set([
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
]);

/** Catalog unit name → department code (matches API phase8-department-catalog). */
export const UNIT_NAME_TO_DEPT_CODE: Record<string, string> = {
  Medical: 'MEDICAL',
  Media: 'MEDIA',
  "Children's Church Teachers": 'CHILDREN',
  Choir: 'CHOIR',
  'Prayer Squad': 'PRAYER',
  Ushering: 'USHERING',
  'Harvesters Squad': 'EVANGELISM',
  'Youth Ministry': 'YOUTH',
  "Teens' Church": 'TEENS',
  Protocol: 'PROTOCOL',
};

export const DEPT_MODULE_LABELS: Record<string, string> = {
  MEDICAL: 'Medical',
  MEDIA: 'Media',
  CHILDREN: "Children's Church",
  CHOIR: 'Choir',
  PRAYER: 'Prayer Squad',
  USHERING: 'Ushering',
  EVANGELISM: 'Harvesters Squad',
  YOUTH: 'Youth Ministry',
  TEENS: "Teens' Church",
  PROTOCOL: 'Protocol',
};

export function isDeptModuleCode(code: string | null | undefined): boolean {
  return !!code && DEPT_MODULE_CODES.has(code);
}

export function resolveDeptModuleCode(
  departmentCode: string | null | undefined,
  unitName: string,
): string | null {
  if (isDeptModuleCode(departmentCode)) return departmentCode!;
  const fromName = UNIT_NAME_TO_DEPT_CODE[unitName];
  if (isDeptModuleCode(fromName)) return fromName!;

  const norm = unitName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const aliases: Record<string, string> = {
    'youth mistry': 'YOUTH',
    'youth ministry': 'YOUTH',
    'teens church': 'TEENS',
    'harvesters squad': 'EVANGELISM',
  };
  const alias = aliases[norm];
  if (isDeptModuleCode(alias)) return alias;
  return null;
}

/** Phase 8 modules, legacy workspace units, resolved codes, or any catalog service unit. */
export function showDepartmentToolsTab(departmentCode: string | null | undefined, unitName: string): boolean {
  if (usesLegacyDepartmentWorkspace(unitName)) return true;
  if (departmentCode && ['USHERING', 'CHOIR', 'EVANGELISM', 'YOUTH', 'TEENS', 'CHILDREN', 'PROTOCOL', 'PRAYER', 'MEDIA', 'MEDICAL'].includes(departmentCode)) {
    return true;
  }
  if (resolveDeptModuleCode(departmentCode, unitName)) return true;
  return (CATALOG_UNIT_NAMES as Set<string>).has(unitName.trim());
}

export function deptToolsApiBase(unitId: string): string {
  return `/service-units/${unitId}/dept-tools`;
}
