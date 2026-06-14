import { DEPT_MODULE_CODES } from '../../prisma/dept-module-catalog';

type SettingsObject = Record<string, unknown>;

export type DepartmentModuleCode = (typeof DEPT_MODULE_CODES)[number];

export type DepartmentModuleSettings = {
  enabledModules: Partial<Record<DepartmentModuleCode, boolean>>;
  tabs: Partial<Record<DepartmentModuleCode, Record<string, boolean>>>;
};

export const DEFAULT_DEPARTMENT_TABS: Record<DepartmentModuleCode, string[]> = {
  MEDICAL: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'feedbacks', 'inventory', 'resources', 'messages', 'special'],
  MEDIA: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'feedbacks', 'inventory', 'resources', 'tasks', 'messages', 'special'],
  CHILDREN: ['dashboard', 'children-list', 'children-parents', 'children-teachers', 'children-birthdays', 'children-roster', 'children-curriculum', 'children-reports', 'children-checkin', 'children-sunday-report', 'children-classes', 'reports', 'feedbacks', 'resources', 'messages'],
  CHOIR: ['dashboard', 'choir-roster', 'choir-library', 'choir-planning', 'choir-attendance', 'choir-talent', 'reports', 'feedbacks', 'resources', 'messages'],
  PRAYER: ['dashboard', 'prayer-assignments', 'prayer-schedule', 'prayer-intake', 'prayer-progress', 'prayer-scripture', 'reports', 'feedbacks', 'resources', 'messages'],
  USHERING: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'feedbacks', 'resources', 'messages'],
  EVANGELISM: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'feedbacks', 'resources', 'messages'],
  YOUTH: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'feedbacks', 'resources', 'messages'],
  TEENS: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'feedbacks', 'resources', 'messages'],
  PROTOCOL: ['dashboard', 'attendance', 'schedules', 'assignments', 'reports', 'feedbacks', 'resources', 'messages'],
};

function asObject(value: unknown): SettingsObject {
  return value && typeof value === 'object' ? (value as SettingsObject) : {};
}

export function parseDepartmentModuleSettings(rawSettings: unknown): DepartmentModuleSettings {
  const settings = asObject(rawSettings);
  const section = asObject(settings.departmentModuleSettings);
  const enabledRaw = asObject(section.enabledModules);
  const tabsRaw = asObject(section.tabs);

  const enabledModules: Partial<Record<DepartmentModuleCode, boolean>> = {};
  const tabs: Partial<Record<DepartmentModuleCode, Record<string, boolean>>> = {};

  for (const code of DEPT_MODULE_CODES) {
    const enabled = enabledRaw[code];
    if (typeof enabled === 'boolean') enabledModules[code] = enabled;

    const tabMap = asObject(tabsRaw[code]);
    const parsed: Record<string, boolean> = {};
    for (const [tabId, value] of Object.entries(tabMap)) {
      if (typeof value === 'boolean') parsed[tabId] = value;
    }
    if (Object.keys(parsed).length > 0) tabs[code] = parsed;
  }

  return { enabledModules, tabs };
}

export function isDepartmentModuleEnabled(
  config: DepartmentModuleSettings,
  code: DepartmentModuleCode,
): boolean {
  return config.enabledModules[code] !== false;
}

export function enabledTabsForDepartment(
  config: DepartmentModuleSettings,
  code: DepartmentModuleCode,
): string[] {
  const defaults = DEFAULT_DEPARTMENT_TABS[code] ?? [];
  const overrides = config.tabs[code] ?? {};
  return defaults.filter((tabId) => overrides[tabId] !== false);
}

export function mergeDepartmentModuleSettingsIntoChurchSettings(
  rawSettings: unknown,
  patch:
    | DepartmentModuleSettings
    | {
        enabledModules?: Record<string, boolean>;
        tabs?: Record<string, Record<string, boolean>>;
      }
    | undefined,
): SettingsObject {
  const current = asObject(rawSettings);
  if (!patch) return current;

  const prev = parseDepartmentModuleSettings(current);
  const merged: DepartmentModuleSettings = {
    enabledModules: { ...prev.enabledModules, ...(patch.enabledModules ?? {}) },
    tabs: { ...prev.tabs },
  };

  for (const code of DEPT_MODULE_CODES) {
    if (patch.tabs?.[code]) {
      merged.tabs[code] = { ...(prev.tabs[code] ?? {}), ...patch.tabs[code] };
    }
  }

  return {
    ...current,
    departmentModuleSettings: merged,
  };
}
