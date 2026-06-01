import { BadRequestException } from '@nestjs/common';
import { MembershipAttendanceService } from './membership-attendance.service';

describe('MembershipAttendanceService', () => {
  const prisma = {
    member: { findFirst: jest.fn() },
    churchService: { findFirst: jest.fn() },
    attendanceRecord: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const activity = { log: jest.fn() };
  const service = new MembershipAttendanceService(prisma as never, activity as never);

  beforeEach(() => jest.clearAllMocks());

  it('requires churchServiceId for SERVICE scope', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm1', churchId: 'c1', familyId: null });
    await expect(
      service.recordOne('c1', {
        memberId: 'm1',
        scope: 'SERVICE',
        serviceDate: '2026-05-29',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
