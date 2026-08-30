import { BadRequestException } from '@nestjs/common';
import { MarketingInboundType } from '@prisma/client';
import { MarketingInboundService } from './marketing-inbound.service';

describe('MarketingInboundService', () => {
  const prisma = {
    platformMarketingSubmission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const email = { send: jest.fn() };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'PLATFORM_SUPPORT_INBOX') return 'support@church-hub.online';
      return undefined;
    }),
  };

  const service = new MarketingInboundService(
    prisma as never,
    email as never,
    config as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.platformMarketingSubmission.create.mockResolvedValue({ id: 'sub-1' });
    email.send.mockResolvedValue(undefined);
  });

  it('persists contact submission and emails support inbox', async () => {
    const result = await service.submit({
      type: MarketingInboundType.CONTACT,
      name: 'Jane Doe',
      email: 'jane@example.com',
      organization: 'Grace Chapel',
      subject: 'Demo request',
      message: 'We would like a product demo please.',
    });

    expect(result.ok).toBe(true);
    expect(prisma.platformMarketingSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: MarketingInboundType.CONTACT,
          email: 'jane@example.com',
        }),
      }),
    );
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@church-hub.online',
        purpose: 'connect',
      }),
    );
  });

  it('requires subject for contact submissions', async () => {
    await expect(
      service.submit({
        type: MarketingInboundType.CONTACT,
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'Hello there from the marketing site.',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts feedback with optional rating', async () => {
    await service.submit({
      type: MarketingInboundType.FEEDBACK,
      name: 'John Smith',
      email: 'john@example.com',
      subject: 'Mobile app',
      message: 'The dashboard loads quickly on my phone.',
      rating: 5,
    });

    expect(prisma.platformMarketingSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: MarketingInboundType.FEEDBACK,
          rating: 5,
        }),
      }),
    );
  });
});
