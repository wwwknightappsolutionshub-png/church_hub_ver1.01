import { BadRequestException } from '@nestjs/common';
import { OutreachSyncConflictService } from './outreach-sync-conflict.service';

describe('OutreachSyncConflictService', () => {
  const prisma = {
    syncConflict: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    syncQueueItem: { updateMany: jest.fn() },
  };
  const outreach = { captureContact: jest.fn() };
  const service = new OutreachSyncConflictService(prisma as never, outreach as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists open conflicts', async () => {
    prisma.syncConflict.findMany.mockResolvedValue([{ id: 'c1' }]);
    const rows = await service.listOpenConflicts('church-1');
    expect(rows).toHaveLength(1);
  });

  it('rejects resolving an already resolved conflict', async () => {
    prisma.syncConflict.findFirst.mockResolvedValue({ id: 'c1', status: 'RESOLVED' });
    await expect(
      service.resolveConflict('church-1', 'c1', 'user-1', 'CLIENT_WINS'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves with client wins', async () => {
    prisma.syncConflict.findFirst.mockResolvedValue({
      id: 'c1',
      status: 'OPEN',
      entityType: 'OUTREACH_CAPTURE',
      clientId: 'client-1',
      clientPayload: { firstName: 'Ada' },
      serverPayload: { firstName: 'Ada', phone: '1' },
    });
    prisma.syncConflict.update.mockResolvedValue({ id: 'c1', status: 'RESOLVED' });
    outreach.captureContact.mockResolvedValue({});
    await service.resolveConflict('church-1', 'c1', 'user-1', 'CLIENT_WINS');
    expect(outreach.captureContact).toHaveBeenCalled();
    expect(prisma.syncQueueItem.updateMany).toHaveBeenCalled();
  });
});
