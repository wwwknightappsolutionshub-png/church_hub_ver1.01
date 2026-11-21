import { BadRequestException } from '@nestjs/common';
import { ServiceUnitsService } from './service-units.service';

describe('ServiceUnitsService.createUnitWithSetup', () => {
  const prisma: {
    $transaction: jest.Mock;
    serviceUnitLeader: { deleteMany: jest.Mock };
    serviceUnitMember: { deleteMany: jest.Mock };
    serviceUnit: { delete: jest.Mock };
  } = {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    serviceUnitLeader: { deleteMany: jest.fn() },
    serviceUnitMember: { deleteMany: jest.fn() },
    serviceUnit: { delete: jest.fn() },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = Object.create(ServiceUnitsService.prototype);
    service.createUnit = jest.fn();
    service.assignUnitMember = jest.fn();
    service.prisma = prisma;
    service.personToAssignDto = ServiceUnitsService.prototype['personToAssignDto'];
  });

  it('creates unit then attaches members and leader', async () => {
    service.createUnit.mockResolvedValue({ id: 'unit-1', name: 'Choir' });
    service.assignUnitMember
      .mockResolvedValueOnce({ memberId: 'm1' })
      .mockResolvedValueOnce({ memberId: 'm-leader', unitRole: 'UNIT_ADMIN' });

    const result = await ServiceUnitsService.prototype.createUnitWithSetup.call(
      service,
      'staff-1',
      'church-1',
      {
        name: 'Choir',
        members: [{ memberId: '11111111-1111-4111-8111-111111111111' }],
        leader: { firstName: 'Unit', lastName: 'Admin', email: 'ua@demo.church' },
      },
    );

    expect(service.createUnit).toHaveBeenCalledWith(
      'church-1',
      expect.objectContaining({ name: 'Choir' }),
    );
    expect(service.assignUnitMember).toHaveBeenCalledTimes(2);
    expect(service.assignUnitMember.mock.calls[1][3]).toMatchObject({ unitRole: 'UNIT_ADMIN' });
    expect(result.unit.id).toBe('unit-1');
    expect(prisma.serviceUnit.delete).not.toHaveBeenCalled();
  });

  it('rolls back the new unit when member attach fails', async () => {
    service.createUnit.mockResolvedValue({ id: 'unit-2', name: 'Broken' });
    service.assignUnitMember.mockRejectedValue(new BadRequestException('bad member'));

    await expect(
      ServiceUnitsService.prototype.createUnitWithSetup.call(service, 'staff-1', 'church-1', {
        name: 'Broken',
        members: [{ firstName: 'Bad', lastName: 'Row' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.serviceUnitLeader.deleteMany).toHaveBeenCalledWith({
      where: { serviceUnitId: 'unit-2' },
    });
    expect(prisma.serviceUnitMember.deleteMany).toHaveBeenCalledWith({
      where: { serviceUnitId: 'unit-2' },
    });
    expect(prisma.serviceUnit.delete).toHaveBeenCalledWith({ where: { id: 'unit-2' } });
  });

  it('allows empty members and skipped leader', async () => {
    service.createUnit.mockResolvedValue({ id: 'unit-3', name: 'Empty' });
    const result = await ServiceUnitsService.prototype.createUnitWithSetup.call(
      service,
      'staff-1',
      'church-1',
      { name: 'Empty' },
    );
    expect(service.assignUnitMember).not.toHaveBeenCalled();
    expect(result.members).toEqual([]);
    expect(result.leader).toBeNull();
  });
});
