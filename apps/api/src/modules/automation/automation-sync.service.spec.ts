import { AutomationSyncService } from './automation-sync.service';

describe('AutomationSyncService', () => {
  const prisma = {
    syncQueueItem: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };
  const outreach = { captureContact: jest.fn() };
  const attendance = { recordBulk: jest.fn() };
  let service: AutomationSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutomationSyncService(
      prisma as never,
      outreach as never,
      attendance as never,
    );
  });

  it('processPending returns zeros when queue empty', async () => {
    prisma.syncQueueItem.findMany.mockResolvedValue([]);
    const result = await service.processPending('church-1');
    expect(result).toEqual({ processed: 0, synced: 0, failed: 0 });
  });

  it('queueStats aggregates counts', async () => {
    prisma.syncQueueItem.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(10);
    const stats = await service.queueStats('church-1');
    expect(stats).toEqual({ pending: 2, failed: 1, synced: 10 });
  });
});
