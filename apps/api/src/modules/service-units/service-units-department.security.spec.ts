import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ServiceUnitsDepartmentService } from './service-units-department.service';

describe('Department weekly report security', () => {
  const unit = {
    id: 'unit-1',
    churchId: 'church-a',
    name: 'Choir <b>alert</b>',
    departmentCode: 'OTHER',
    isActive: true,
  };

  function harness(options?: { member?: boolean; manage?: boolean }) {
    const enqueue = jest.fn().mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: any = Object.create(ServiceUnitsDepartmentService.prototype);
    service.commQueue = { enqueue };
    service.moduleAccess = {
      resolveContext: jest.fn().mockResolvedValue({
        userId: 'user-1',
        churchId: 'church-a',
        unitMembershipIds: options?.member ? ['unit-1'] : [],
      }),
      canManageServiceUnit: jest.fn().mockReturnValue(options?.manage === true),
    };
    service.prisma = {
      serviceUnit: { findFirst: jest.fn().mockResolvedValue(unit) },
      serviceUnitMember: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
      serviceUnitMeeting: { findMany: jest.fn().mockResolvedValue([]) },
      serviceUnitWeeklyReport: {
        findMany: jest.fn().mockResolvedValue([{ id: 'stored', body: 'leadership report' }]),
        upsert: jest.fn().mockResolvedValue({ id: 'report-1' }),
      },
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'admin-1', email: 'admin@church.test', phone: null })
          .mockResolvedValueOnce({ id: 'pastor-1', email: 'pastor@church.test', phone: null }),
        findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }]),
      },
    };
    return { service, enqueue };
  }

  it('hides another church unit instead of returning its roll call', async () => {
    const { service } = harness();
    service.prisma.serviceUnit.findFirst.mockResolvedValue(null);

    await expect(
      ServiceUnitsDepartmentService.prototype.getDashboard.call(
        service,
        'church-a',
        'unit-from-church-b',
        4,
        'user-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(service.prisma.attendanceRecord.findMany).not.toHaveBeenCalled();
  });

  it('refuses the dashboard to someone who is not in the unit', async () => {
    const { service } = harness();

    await expect(
      ServiceUnitsDepartmentService.prototype.getDashboard.call(
        service,
        'church-a',
        'unit-1',
        4,
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.prisma.serviceUnitMember.findMany).not.toHaveBeenCalled();
  });

  it('omits member email and stored leadership reports for a unit member', async () => {
    const { service } = harness({ member: true });

    const dashboard = await ServiceUnitsDepartmentService.prototype.getDashboard.call(
      service,
      'church-a',
      'unit-1',
      10_000,
      'user-1',
    );

    expect(service.prisma.serviceUnitMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          member: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    );
    expect(dashboard.weeklyReports).toEqual([]);
    const since = service.prisma.attendanceRecord.findMany.mock.calls[0][0].where.serviceDate.gte as Date;
    const days = (Date.now() - since.getTime()) / 86_400_000;
    expect(days).toBeLessThan(60);
  });

  it('rejects a week that is not a real calendar date', () => {
    const { service } = harness();
    expect(() => service.parseWeekStart('2026-02-31')).toThrow(BadRequestException);
    expect(() => service.parseWeekStart('2026-11-26<script>')).toThrow(BadRequestException);
  });

  it('emails one admin and one pastor, not the rest of the unit', async () => {
    const { service, enqueue } = harness({ manage: true });

    await ServiceUnitsDepartmentService.prototype.generateWeeklyReport.call(
      service,
      'church-a',
      'unit-1',
      '2026-11-23',
      'leader-1',
      { weekEnd: '2026-11-26', notifyInApp: true },
    );

    expect(enqueue).toHaveBeenCalledTimes(4);
    for (const [, item] of enqueue.mock.calls) {
      expect(item.serviceUnitId).toBeUndefined();
      expect(['admin-1', 'pastor-1']).toContain(item.targetUserId);
      expect(item.body.includes('<')).toBe(false);
      expect(item.channels).toEqual(item.channels[0] === 'EMAIL' ? ['EMAIL'] : ['IN_APP']);
    }
    expect(enqueue.mock.calls.filter(([, item]) => item.channels[0] === 'EMAIL')).toHaveLength(2);
  });

  it('does not email anyone when the scheduler generates reports', async () => {
    const { service, enqueue } = harness();

    await ServiceUnitsDepartmentService.prototype.generateWeeklyReport.call(
      service,
      'church-a',
      'unit-1',
      '2026-11-23',
    );

    expect(service.prisma.user.findFirst).not.toHaveBeenCalled();
    expect(enqueue.mock.calls.every(([, item]) => item.channels.join() === 'IN_APP')).toBe(true);
  });
});
