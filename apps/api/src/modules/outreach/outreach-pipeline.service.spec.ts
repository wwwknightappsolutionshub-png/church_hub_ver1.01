import { NotFoundException } from '@nestjs/common';
import { OutreachPipelineService } from './outreach-pipeline.service';

describe('OutreachPipelineService', () => {
  const prisma = {
    outreachContact: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    member: { findFirst: jest.fn(), create: jest.fn() },
    followUp: { update: jest.fn() },
    church: { findUnique: jest.fn() },
  };
  const bus = { createRideRequest: jest.fn() };
  const activity = { log: jest.fn() };

  const service = new OutreachPipelineService(
    prisma as never,
    bus as never,
    activity as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('convertToMember throws when contact missing', async () => {
    prisma.outreachContact.findFirst.mockResolvedValue(null);
    await expect(service.convertToMember('c1', 'id1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('convertToMember creates member and bus ride when pickup flagged', async () => {
    prisma.outreachContact.findFirst.mockResolvedValue({
      id: 'oc1',
      churchId: 'c1',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+441234',
      email: null,
      notes: null,
      voiceNotes: null,
      memberId: null,
      followUpId: null,
      needsBusPickup: true,
      pickupAddress: 'High St',
      locationLabel: null,
      latitude: 51.1,
      longitude: 0.2,
      busPickupNotes: 'Sunday',
    });
    prisma.member.create.mockResolvedValue({ id: 'm1', firstName: 'Jane', lastName: 'Doe' });
    prisma.outreachContact.update.mockResolvedValue({
      id: 'oc1',
      memberId: 'm1',
      convertStage: 'CONVERTED',
    });
    prisma.church.findUnique.mockResolvedValue({
      name: 'Demo Church',
      address: '1 Church Rd',
      city: 'Town',
    });
    bus.createRideRequest.mockResolvedValue({ id: 'ride1' });

    const result = await service.convertToMember('c1', 'oc1', 'user1');

    expect(prisma.member.create).toHaveBeenCalled();
    expect(bus.createRideRequest).toHaveBeenCalled();
    expect(result.ride).toEqual({ id: 'ride1' });
    expect(activity.log).toHaveBeenCalled();
  });
});
