import { NotFoundException } from '@nestjs/common';
import { MembershipTimelineService } from './membership-timeline.service';

describe('MembershipTimelineService', () => {
  const prisma = {
    member: { findFirst: jest.fn() },
    memberActivityLog: { findMany: jest.fn() },
    classEnrollment: { findMany: jest.fn() },
    attendanceRecord: { findMany: jest.fn() },
    followUp: { findMany: jest.fn() },
    outreachContact: { findMany: jest.fn() },
  };

  const service = new MembershipTimelineService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('throws when member not found', async () => {
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(service.getMemberTimeline('church-1', 'member-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('merges and sorts timeline events newest first', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm1', churchId: 'c1' });
    prisma.memberActivityLog.findMany.mockResolvedValue([
      {
        id: 'a1',
        type: 'MEMBER_CREATED',
        summary: 'Created',
        createdAt: new Date('2026-01-02'),
        metadata: null,
      },
    ]);
    prisma.classEnrollment.findMany.mockResolvedValue([]);
    prisma.attendanceRecord.findMany.mockResolvedValue([
      {
        id: 'r1',
        present: true,
        scope: 'SERVICE',
        serviceDate: new Date('2026-01-10'),
        churchService: { name: 'Sunday' },
        serviceUnit: null,
      },
    ]);
    prisma.followUp.findMany.mockResolvedValue([]);
    prisma.outreachContact.findMany.mockResolvedValue([]);

    const events = await service.getMemberTimeline('c1', 'm1');
    expect(events[0].type).toBe('ATTENDANCE');
    expect(events[1].type).toBe('ACTIVITY');
  });
});
