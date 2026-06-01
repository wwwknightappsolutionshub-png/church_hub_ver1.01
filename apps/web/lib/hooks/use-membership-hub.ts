'use client';

import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { ChurchServiceDto, MembershipClassDefinitionDto } from '@church-hub/shared-types';
import type { TimelineEventDto } from '@church-hub/shared-types';

export function useChurchServices() {
  return useApiQuery<ChurchServiceDto[]>(['membership-church-services'], '/membership/church-services');
}

export function useClassDefinitions() {
  return useApiQuery<MembershipClassDefinitionDto[]>(
    ['membership-class-definitions'],
    '/membership/class-definitions',
  );
}

export function useClassEnrollments(memberId?: string) {
  const q = memberId ? `?memberId=${memberId}` : '';
  return useApiQuery<Array<{
    id: string;
    status: string;
    enrolledAt: string;
    classDefinition: MembershipClassDefinitionDto;
    member: { id: string; firstName: string; lastName: string };
  }>>(['membership-class-enrollments', memberId ?? 'all'], `/membership/class-enrollments${q}`);
}

export function useMemberTimeline(memberId: string | null) {
  return useApiQuery<TimelineEventDto[]>(
    ['membership-timeline', memberId ?? ''],
    `/membership/members/${memberId}/timeline`,
    { enabled: !!memberId },
  );
}

export function useServiceUnitsList() {
  return useApiQuery<Array<{ id: string; name: string }>>(
    ['service-units-list-membership'],
    '/service-units',
  );
}
