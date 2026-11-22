import type { MemberRoleType } from '@prisma/client';
import { ModuleAccessService } from './module-access.service';
import type { UserMemberContext } from './module-access.service';

function baseCtx(overrides: Partial<UserMemberContext> = {}): UserMemberContext {
  return {
    userId: 'user-1',
    churchId: 'church-a',
    memberId: 'member-1',
    memberStatus: 'ACTIVE_MEMBER',
    userRoles: [],
    memberRoles: [],
    unitMembershipIds: [],
    unitAdminUnitIds: [],
    unitDeputyUnitIds: [],
    unitLeaderUnitIds: [],
    ...overrides,
  };
}

describe('Establishment access matrix (Phase 2)', () => {
  const serviceUnitFindMany = jest.fn();
  const cellBranchFindMany = jest.fn();
  const cellDeputyFindMany = jest.fn();

  const prisma = {
    serviceUnit: { findMany: serviceUnitFindMany },
    cellBranch: { findMany: cellBranchFindMany },
    cellLeadershipDeputy: { findMany: cellDeputyFindMany },
  };

  const service = new ModuleAccessService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    cellBranchFindMany.mockResolvedValue([]);
    cellDeputyFindMany.mockResolvedValue([]);
    serviceUnitFindMany.mockResolvedValue([]);
  });

  it('Admin → manager (create/assign/mutate/unassigned)', async () => {
    const access = await service.resolveEstablishmentAccess(
      baseCtx({ userRoles: ['ADMIN'] }),
    );
    expect(access.mode).toBe('manager');
    expect(access.canCreate).toBe(true);
    expect(access.canAssign).toBe(true);
    expect(access.canMutate).toBe(true);
    expect(access.canViewUnassigned).toBe(true);
    expect(access.canArchive).toBe(true);
  });

  it('Pastor → manager', async () => {
    const access = await service.resolveEstablishmentAccess(
      baseCtx({ userRoles: ['PASTOR'] }),
    );
    expect(access.mode).toBe('manager');
    expect(access.canCreate).toBe(true);
  });

  it('Follow-up Unit Leader → manager', async () => {
    serviceUnitFindMany.mockResolvedValue([
      {
        id: 'fu-unit',
        name: 'Follow-up',
        leaders: [{ isUnitAdmin: true, role: null }],
      },
    ]);
    const access = await service.resolveEstablishmentAccess(
      baseCtx({ userRoles: ['LEADER'], unitLeaderUnitIds: ['fu-unit'] }),
    );
    expect(access.mode).toBe('manager');
    expect(access.canAssign).toBe(true);
  });

  it('Harvesters worker (member only) → worker, assigned-only mutate', async () => {
    serviceUnitFindMany.mockResolvedValue([
      { id: 'harv', name: 'Harvesters Squad', leaders: [] },
    ]);
    const access = await service.resolveEstablishmentAccess(
      baseCtx({ userRoles: ['MEMBER'] }),
    );
    expect(access.mode).toBe('worker');
    expect(access.canCreate).toBe(false);
    expect(access.canAssign).toBe(false);
    expect(access.canMutate).toBe(true);
    expect(access.canViewUnassigned).toBe(false);
    expect(access.canRequestArchive).toBe(true);

    expect(
      service.canMutateEstablishmentRecord(access, 'user-1', { assignedToId: 'user-1' }),
    ).toBe(true);
    expect(
      service.canMutateEstablishmentRecord(access, 'user-1', { assignedToId: 'other' }),
    ).toBe(false);
    expect(
      service.canViewEstablishmentRecord(access, 'user-1', {
        assignedToId: null,
        wsfCellBranchId: null,
      }),
    ).toBe(false);
  });

  it('Prayer Squad → viewOnly (no mutate, no unassigned)', async () => {
    serviceUnitFindMany.mockResolvedValue([
      { id: 'prayer', name: 'Prayer Squad', leaders: [] },
    ]);
    const access = await service.resolveEstablishmentAccess(
      baseCtx({ userRoles: ['MEMBER'] }),
    );
    expect(access.mode).toBe('viewOnly');
    expect(access.canMutate).toBe(false);
    expect(access.canCreate).toBe(false);
    expect(access.canViewUnassigned).toBe(false);
    expect(
      service.canViewEstablishmentRecord(access, 'user-1', {
        assignedToId: 'someone',
        wsfCellBranchId: null,
      }),
    ).toBe(true);
    expect(
      service.canViewEstablishmentRecord(access, 'user-1', {
        assignedToId: null,
        wsfCellBranchId: null,
      }),
    ).toBe(false);
  });

  it('WSF Leader → wsfLeader scoped to their branches only', async () => {
    cellBranchFindMany.mockResolvedValue([{ id: 'branch-a' }]);
    const access = await service.resolveEstablishmentAccess(
      baseCtx({ userRoles: ['LEADER'], memberId: 'member-wsf' }),
    );
    expect(access.mode).toBe('wsfLeader');
    expect(access.wsfBranchIds).toEqual(['branch-a']);
    expect(access.canMutate).toBe(false);
    expect(
      service.canViewEstablishmentRecord(access, 'user-1', {
        assignedToId: 'x',
        wsfCellBranchId: 'branch-a',
      }),
    ).toBe(true);
    expect(
      service.canViewEstablishmentRecord(access, 'user-1', {
        assignedToId: 'x',
        wsfCellBranchId: 'branch-b',
      }),
    ).toBe(false);

    const scope = service.buildEstablishmentListScope(access, 'user-1');
    expect(scope).toEqual({ wsfCellBranchId: { in: ['branch-a'] } });
  });

  it('plain Member / LEADER without unit → none', async () => {
    const member = await service.resolveEstablishmentAccess(
      baseCtx({ userRoles: ['MEMBER'], memberId: 'm2' }),
    );
    expect(member.mode).toBe('none');

    const leaderOnly = await service.resolveEstablishmentAccess(
      baseCtx({ userRoles: ['LEADER'], memberId: 'm3' }),
    );
    expect(leaderOnly.mode).toBe('none');
  });

  it('Evangelist member role without unit leadership → worker', async () => {
    const access = await service.resolveEstablishmentAccess(
      baseCtx({
        userRoles: ['MEMBER'],
        memberRoles: ['EVANGELIST'] as MemberRoleType[],
      }),
    );
    expect(access.mode).toBe('worker');
    expect(access.canCreate).toBe(false);
  });

  it('list scope: manager is unscoped; worker filters assignedToId', async () => {
    expect(
      service.buildEstablishmentListScope(
        {
          mode: 'manager',
          canCreate: true,
          canAssign: true,
          canMutate: true,
          canViewUnassigned: true,
          canArchive: true,
          canRequestArchive: false,
          canAssignWsf: true,
          wsfBranchIds: [],
        },
        'user-1',
      ),
    ).toBeNull();

    expect(
      service.buildEstablishmentListScope(
        {
          mode: 'worker',
          canCreate: false,
          canAssign: false,
          canMutate: true,
          canViewUnassigned: false,
          canArchive: false,
          canRequestArchive: true,
          canAssignWsf: false,
          wsfBranchIds: [],
        },
        'user-1',
      ),
    ).toEqual({ assignedToId: 'user-1' });
  });
});
