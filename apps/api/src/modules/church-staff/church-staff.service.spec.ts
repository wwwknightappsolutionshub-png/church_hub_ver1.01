import { BadRequestException } from '@nestjs/common';
import { ChurchStaffService } from './church-staff.service';

describe('ChurchStaffService unit leadership', () => {
  const churchId = '11111111-1111-4111-8111-111111111111';
  const memberId = '22222222-2222-4222-8222-222222222222';
  const unitA = '33333333-3333-4333-8333-333333333333';
  const unitB = '44444444-4444-4444-8444-444444444444';
  const foreignUnit = '55555555-5555-4555-8555-555555555555';

  const prisma = {
    serviceUnit: { findMany: jest.fn() },
    serviceUnitLeader: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    serviceUnitMember: { upsert: jest.fn() },
    member: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new ChurchStaffService(
    prisma as never,
    { render: jest.fn() } as never,
    { send: jest.fn() } as never,
    { createPasswordSetupLink: jest.fn().mockResolvedValue('http://localhost/reset') } as never,
    { sendWhatsApp: jest.fn() } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.serviceUnitLeader.findMany.mockResolvedValue([]);
    prisma.serviceUnitLeader.deleteMany.mockResolvedValue({ count: 0 });
    prisma.serviceUnitLeader.upsert.mockResolvedValue({});
    prisma.serviceUnitMember.upsert.mockResolvedValue({});
    prisma.member.findUnique.mockResolvedValue({ roles: ['ADULT'] });
    prisma.member.update.mockResolvedValue({});
  });

  it('syncUnitAdminLeadership rejects units outside the church', async () => {
    prisma.serviceUnit.findMany.mockResolvedValue([{ id: unitA }]);

    await expect(
      service.syncUnitAdminLeadership(churchId, memberId, [unitA, foreignUnit]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.serviceUnitLeader.upsert).not.toHaveBeenCalled();
  });

  it('syncUnitAdminLeadership rejects leading more than one unit', async () => {
    await expect(
      service.syncUnitAdminLeadership(churchId, memberId, [unitA, unitB]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.serviceUnit.findMany).not.toHaveBeenCalled();
    expect(prisma.serviceUnitLeader.upsert).not.toHaveBeenCalled();
  });

  it('syncUnitAdminLeadership assigns unit-admin rows and membership', async () => {
    prisma.serviceUnit.findMany.mockResolvedValue([{ id: unitA }]);
    prisma.serviceUnitLeader.findMany.mockResolvedValue([
      { id: 'old-1', serviceUnitId: foreignUnit },
    ]);

    await service.syncUnitAdminLeadership(churchId, memberId, [unitA]);

    expect(prisma.serviceUnitLeader.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-1'] } },
    });
    expect(prisma.serviceUnitMember.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.serviceUnitLeader.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.serviceUnitLeader.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          serviceUnitId: unitA,
          memberId,
          isUnitAdmin: true,
        }),
        update: expect.objectContaining({ isUnitAdmin: true }),
      }),
    );
    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: memberId },
      data: { roles: ['ADULT', 'LEADER'] },
    });
  });

  it('syncUnitAdminLeadership clears all unit-admin rows when empty', async () => {
    prisma.serviceUnitLeader.findMany.mockResolvedValue([
      { id: 'lead-1', serviceUnitId: unitA },
    ]);

    await service.syncUnitAdminLeadership(churchId, memberId, []);

    expect(prisma.serviceUnit.findMany).not.toHaveBeenCalled();
    expect(prisma.serviceUnitLeader.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['lead-1'] } },
    });
    expect(prisma.serviceUnitLeader.upsert).not.toHaveBeenCalled();
    expect(prisma.member.update).not.toHaveBeenCalled();
  });
});
