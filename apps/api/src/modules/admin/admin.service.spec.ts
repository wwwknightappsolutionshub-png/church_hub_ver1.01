import { AdminService } from './admin.service';

describe('AdminService', () => {
  const prisma = {
    member: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    followUp: { groupBy: jest.fn(), count: jest.fn() },
    outreachContact: { count: jest.fn(), findMany: jest.fn() },
    youthGroup: { count: jest.fn() },
    businessProfile: { count: jest.fn() },
    rideRequest: { count: jest.fn() },
    sermon: { count: jest.fn() },
    syncQueueItem: { count: jest.fn() },
    syncConflict: { count: jest.fn() },
    communicationQueueItem: { count: jest.fn() },
    followUpAutomationRule: { count: jest.fn() },
    communityHubPost: { count: jest.fn() },
  };

  const membership = {
    getUsheringWeeklyAttendanceFlow: jest.fn(),
  };

  const service = new AdminService(prisma as never, membership as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.member.count.mockResolvedValue(10);
    prisma.member.groupBy.mockResolvedValue([]);
    prisma.member.findMany.mockResolvedValue([]);
    prisma.followUp.groupBy.mockResolvedValue([]);
    prisma.followUp.count.mockResolvedValue(0);
    prisma.outreachContact.count.mockResolvedValue(3);
    prisma.outreachContact.findMany.mockResolvedValue([]);
    prisma.youthGroup.count.mockResolvedValue(2);
    prisma.businessProfile.count.mockResolvedValue(1);
    prisma.rideRequest.count.mockResolvedValue(0);
    prisma.sermon.count.mockResolvedValue(4);
    prisma.syncQueueItem.count.mockResolvedValue(1);
    prisma.syncConflict.count.mockResolvedValue(2);
    prisma.communicationQueueItem.count.mockResolvedValue(0);
    prisma.followUpAutomationRule.count.mockResolvedValue(5);
    prisma.communityHubPost.count.mockResolvedValue(1);
  });

  it('returns unified hub with operations block', async () => {
    const hub = await service.getUnifiedHub('church-1');
    expect(hub.metrics.membership.total).toBe(10);
    expect(hub.metrics.growth).toHaveLength(6);
    expect(hub.operations.outreachSyncConflicts).toBe(2);
    expect(hub.modules.length).toBeGreaterThan(5);
    expect(hub.modules.find((m) => m.key === 'outreach')?.status).toBe('attention');
  });
});
