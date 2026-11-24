import { BadRequestException } from '@nestjs/common';
import { MembershipAnalyticsService } from './membership-analytics.service';

describe('MembershipAnalyticsService digest audit', () => {
  it('appends ANALYTICS_DIGEST_UPDATED after valid settings save', async () => {
    const prisma = {
      church: {
        findUnique: jest.fn().mockResolvedValue({ settings: {} }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new MembershipAnalyticsService(prisma as never, audit as never);

    await service.updateDigestSettings(
      'church-1',
      { recipientEmails: ['pastor@demo.church'], enabled: true },
      'user-admin',
    );

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: 'church-1',
        actorId: 'user-admin',
        action: 'ANALYTICS_DIGEST_UPDATED',
        targetType: 'Church',
        targetId: 'church-1',
        metadata: expect.objectContaining({
          enabled: true,
          recipientCount: 1,
        }),
      }),
    );
    expect(
      (audit.append.mock.calls[0][0].metadata as { recipientEmails?: string[] }).recipientEmails,
    ).toBeUndefined();
  });

  it('does not audit when validation fails', async () => {
    const prisma = {
      church: {
        findUnique: jest.fn().mockResolvedValue({ settings: {} }),
        update: jest.fn(),
      },
    };
    const audit = { append: jest.fn() };
    const service = new MembershipAnalyticsService(prisma as never, audit as never);

    await expect(
      service.updateDigestSettings('church-1', { enabled: true }, 'user-admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.church.update).not.toHaveBeenCalled();
    expect(audit.append).not.toHaveBeenCalled();
  });
});