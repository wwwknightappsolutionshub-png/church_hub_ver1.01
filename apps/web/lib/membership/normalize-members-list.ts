import type { PaginatedMembersDto } from '@church-hub/shared-types';

export interface MemberListRow {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  roles?: string[];
  ministryInterests?: string[];
  onboardingStep?: number;
  family?: { id: string; name: string } | null;
}

export function normalizeMembersListResponse(
  data: PaginatedMembersDto<MemberListRow> | MemberListRow[] | undefined,
): PaginatedMembersDto<MemberListRow> {
  if (!data) {
    return { items: [], page: 1, limit: 25, total: 0, totalPages: 0, nextCursor: null };
  }
  if (Array.isArray(data)) {
    return {
      items: data,
      page: 1,
      limit: data.length || 25,
      total: data.length,
      totalPages: data.length > 0 ? 1 : 0,
      nextCursor: null,
    };
  }
  return {
    items: data.items ?? [],
    page: data.page ?? 1,
    limit: data.limit ?? 25,
    total: data.total ?? data.items?.length ?? 0,
    totalPages: data.totalPages ?? 0,
    nextCursor: data.nextCursor ?? null,
  };
}
