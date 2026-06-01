import { ModuleAccessService } from './module-access.service';

describe('ModuleAccessService extensions', () => {
  const prisma = {
    youthGroupMember: { findFirst: jest.fn() },
    parentGuardianLink: { findFirst: jest.fn() },
  };
  const service = new ModuleAccessService(prisma as never);

  const staffCtx = {
    userId: 'u1',
    churchId: 'c1',
    memberId: 'm1',
    memberStatus: 'ACTIVE_MEMBER' as const,
    userRoles: ['PASTOR'],
    memberRoles: [],
    unitMembershipIds: [],
    unitAdminUnitIds: [],
    unitLeaderUnitIds: [],
  };

  it('allows church staff for youth and community hub', () => {
    expect(service.canAccessYouth(staffCtx)).toBe(true);
    expect(service.canAccessCommunityHub(staffCtx)).toBe(true);
    expect(service.canAccessCommunications(staffCtx)).toBe(true);
  });

  it('denies visitors from community hub', () => {
    const visitor = { ...staffCtx, userRoles: [], memberStatus: 'VISITOR' as const };
    expect(service.canAccessCommunityHub(visitor)).toBe(false);
  });

  it('allows youth role members', () => {
    const youth = {
      ...staffCtx,
      userRoles: [],
      memberRoles: ['YOUTH' as const],
    };
    expect(service.canAccessYouth(youth)).toBe(true);
  });

  it('allows department tools for church staff and member admins', () => {
    expect(service.canAccessDepartmentTools(staffCtx)).toBe(true);
    const memberAdmin = {
      ...staffCtx,
      userRoles: [],
      memberRoles: ['ADMIN' as const],
      unitAdminUnitIds: [],
    };
    expect(service.canAccessDepartmentTools(memberAdmin)).toBe(true);
  });
});
