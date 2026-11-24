import { NotFoundException } from '@nestjs/common';
import { OutreachCampaignService } from './outreach-campaign.service';
import { OutreachIntelligenceService } from './outreach-intelligence.service';

describe('Outreach intelligence tenant security', () => {
  it('campaign update rejects foreign campaign id (churchId in where)', async () => {
    const prisma = {
      outreachCampaign: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    const audit = { append: jest.fn() };
    const service = new OutreachCampaignService(prisma as never, audit as never);

    await expect(
      service.update('church-a', 'actor-1', 'campaign-from-church-b', { name: 'Hack' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.outreachCampaign.update).not.toHaveBeenCalled();
    expect(prisma.outreachCampaign.findFirst).toHaveBeenCalledWith({
      where: { id: 'campaign-from-church-b', churchId: 'church-a' },
    });
  });

  it('command centre queries outreach contacts scoped by churchId', async () => {
    const prisma = {
      outreachContact: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new OutreachIntelligenceService(prisma as never);
    await service.commandCentre('church-a');
    expect(prisma.outreachContact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: 'church-a' }),
      }),
    );
  });
});