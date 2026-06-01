import { CommunicationsQueueService } from './communications-queue.service';

describe('CommunicationsQueueService', () => {
  it('enqueue creates pending queue item', async () => {
    const prisma = {
      communicationQueueItem: {
        create: jest.fn().mockResolvedValue({ id: 'q1', status: 'PENDING' }),
        findMany: jest.fn(),
      },
    };
    const service = new CommunicationsQueueService(prisma as never, {} as never, {} as never);
    const row = await service.enqueue('church-1', {
      kind: 'BROADCAST',
      title: 'Test',
      body: 'Hello',
      channels: ['IN_APP'],
    });
    expect(prisma.communicationQueueItem.create).toHaveBeenCalled();
    expect(row.id).toBe('q1');
  });
});
