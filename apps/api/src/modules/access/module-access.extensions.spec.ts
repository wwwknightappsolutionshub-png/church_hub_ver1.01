import type { MemberRoleType } from '@prisma/client';
import { ModuleAccessService } from './module-access.service';
import type { UserMemberContext } from './module-access.service';

describe('ModuleAccessService extensions', () => {
  const prisma = {
    youthGroupMember: { findFirst: jest.fn() },
    parentGuardianLink: { findFirst: jest.fn() },
  };
  const service = new ModuleAccessService(prisma as never);

  const staffCtx: UserMemberContext = {
    userId: 'u1',
    churchId: 'c1',
    memberId: 'm1',
    memberStatus: 'ACTIVE_MEMBER',
    userRoles: ['PASTOR'],
    memberRoles: [],
    unitMembershipIds: [],
    unitAdminUnitIds: [],
    unitDeputyUnitIds: [],
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
      memberRoles: ['YOUTH'] as MemberRoleType[],
    };
    expect(service.canAccessYouth(youth)).toBe(true);
  });

  it('allows department tools for church staff and member admins', () => {
    expect(service.canAccessDepartmentTools(staffCtx)).toBe(true);
    const memberAdmin = {
      ...staffCtx,
      userRoles: [],
      memberRoles: ['ADMIN'] as MemberRoleType[],
      unitLeaderUnitIds: [],
    };
    expect(service.canAccessDepartmentTools(memberAdmin)).toBe(true);
  });

  it('allows department tools for unit leaders who are not church staff', () => {
    const leader: UserMemberContext = {
      ...staffCtx,
      userRoles: ['LEADER'],
      memberRoles: [],
      unitLeaderUnitIds: ['unit-choir'],
      unitAdminUnitIds: ['unit-choir'],
    };
    expect(service.isChurchStaff(leader)).toBe(false);
    expect(service.canManageStaff(leader)).toBe(false);
    expect(service.canAccessDepartmentTools(leader)).toBe(true);
    expect(service.canManageServiceUnit(leader, 'unit-choir')).toBe(true);
    expect(service.canManageServiceUnit(leader, 'unit-other')).toBe(false);
  });

  it('denies department tools for regular members', () => {
    const member: UserMemberContext = {
      ...staffCtx,
      userRoles: ['MEMBER'],
      memberRoles: [],
      unitLeaderUnitIds: [],
      unitAdminUnitIds: [],
    };
    expect(service.canAccessDepartmentTools(member)).toBe(false);
  });

  it('lets deputies operate a unit but not assign leaders', () => {
    const deputy: UserMemberContext = {
      ...staffCtx,
      userRoles: [],
      memberRoles: [],
      unitLeaderUnitIds: ['unit-choir'],
      unitAdminUnitIds: [],
      unitDeputyUnitIds: ['unit-choir'],
    };
    expect(service.canManageServiceUnit(deputy, 'unit-choir')).toBe(true);
    expect(service.canManageUnitLeaders(deputy, 'unit-choir')).toBe(false);
    expect(service.canAssignUnitDeputies(deputy, 'unit-choir')).toBe(false);
    expect(service.canAssignUnitAdmin(deputy)).toBe(false);
  });

  it('lets unit admins assign deputies but not create unit admins', () => {
    const admin: UserMemberContext = {
      ...staffCtx,
      userRoles: [],
      memberRoles: [],
      unitLeaderUnitIds: ['unit-choir'],
      unitAdminUnitIds: ['unit-choir'],
      unitDeputyUnitIds: [],
    };
    expect(service.canManageUnitLeaders(admin, 'unit-choir')).toBe(true);
    expect(service.canAssignUnitDeputies(admin, 'unit-choir')).toBe(true);
    expect(service.canAssignUnitAdmin(admin)).toBe(false);
  });
});
