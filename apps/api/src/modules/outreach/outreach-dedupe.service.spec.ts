import { OutreachDedupeService } from './outreach-dedupe.service';

describe('OutreachDedupeService', () => {
  const prisma = {
    followUp: { findMany: jest.fn() },
  };
  const service = new OutreachDedupeService(prisma as never);

  it('returns empty when no phone or email', async () => {
    const rows = await service.findActiveJourneyDuplicates('church-1');
    expect(rows).toEqual([]);
    expect(prisma.followUp.findMany).not.toHaveBeenCalled();
  });
});