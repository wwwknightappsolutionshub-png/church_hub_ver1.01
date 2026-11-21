import { ForbiddenException } from '@nestjs/common';
import { MinistryCellsAccessService } from './ministry-cells-access.service';

describe('MinistryCellsAccessService deputies', () => {
  const prisma = {
    church: { findUnique: jest.fn() },
    userRole: { findMany: jest.fn() },
    cellProvince: { findFirst: jest.fn() },
    cellBranch: { findFirst: jest.fn() },
    cellLeadershipDeputy: { findMany: jest.fn(), findFirst: jest.fn() },
  };

  const service = new MinistryCellsAccessService(prisma as never);
  const user = { userId: 'u-dep', churchId: 'c1', roles: [] as string[] };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.church.findUnique.mockResolvedValue({ settings: {} });
    prisma.userRole.findMany.mockResolvedValue([]);
    prisma.cellProvince.findFirst.mockResolvedValue(null);
    prisma.cellBranch.findFirst.mockResolvedValue(null);
  });

  it('resolves branch Assistant as cellLeader deputy', async () => {
    prisma.cellLeadershipDeputy.findMany.mockResolvedValue([
      { scope: 'BRANCH', branchId: 'b1', provinceId: null, role: 'ASSISTANT' },
    ]);
    const ctx = await service.resolveRole(user as never, 'c1');
    expect(ctx.role).toBe('cellLeader');
    expect(ctx.isDeputy).toBe(true);
    expect(ctx.deputyRole).toBe('ASSISTANT');
    expect(ctx.leaderBranchId).toBe('b1');
    expect(ctx.deputyBranchIds).toEqual(['b1']);
  });

  it('resolves province Secretary as provincialLeader deputy', async () => {
    prisma.cellLeadershipDeputy.findMany.mockResolvedValue([
      { scope: 'PROVINCE', branchId: null, provinceId: 'p1', role: 'SECRETARY' },
    ]);
    const ctx = await service.resolveRole(user as never, 'c1');
    expect(ctx.role).toBe('provincialLeader');
    expect(ctx.isDeputy).toBe(true);
    expect(ctx.deputyProvinceIds).toEqual(['p1']);
  });

  it('blocks deputies from assigning other deputies', async () => {
    prisma.cellLeadershipDeputy.findMany.mockResolvedValue([
      { scope: 'BRANCH', branchId: 'b1', provinceId: null, role: 'ASSISTANT' },
    ]);
    await expect(
      service.assertCanAssignDeputies(user as never, 'c1', { branchId: 'b1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows primary branch leader to assign deputies', async () => {
    prisma.cellLeadershipDeputy.findMany.mockResolvedValue([]);
    prisma.cellBranch.findFirst
      .mockResolvedValueOnce({ id: 'b1' }) // resolveRole primary leader
      .mockResolvedValueOnce({ leaderUserId: 'u-dep' }); // assertCanAssignDeputies
    const leaderUser = { userId: 'u-dep', churchId: 'c1', roles: [] as string[] };
    // First call path: resolveRole finds primary branch
    prisma.cellBranch.findFirst.mockReset();
    prisma.cellProvince.findFirst.mockResolvedValue(null);
    prisma.cellBranch.findFirst
      .mockResolvedValueOnce({ id: 'b1' })
      .mockResolvedValueOnce({ leaderUserId: 'u-dep' });
    prisma.cellLeadershipDeputy.findMany.mockResolvedValue([]);

    await expect(
      service.assertCanAssignDeputies(leaderUser as never, 'c1', { branchId: 'b1' }),
    ).resolves.toMatchObject({ role: 'cellLeader', isDeputy: false });
  });
});
