'use client';

import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import type { ChildrenClassDefinitionDto } from '@church-hub/shared-types';

export function useChildrenClassGroups(unitId: string, opts?: { includeInactive?: boolean }) {
  const base = `${deptToolsApiBase(unitId)}/children/classes`;
  const url = opts?.includeInactive ? `${base}?includeInactive=true` : base;
  const query = useApiQuery<ChildrenClassDefinitionDto[]>(
    ['children-classes', unitId, opts?.includeInactive ? 'all' : 'active'],
    url,
  );

  const activeGroups = (query.data ?? []).filter((g) => g.isActive);

  return {
    ...query,
    classes: query.data ?? [],
    activeClasses: activeGroups,
    classOptions: activeGroups.map((g) => ({
      value: g.code,
      label: g.name,
      ages: g.ages,
    })),
  };
}
