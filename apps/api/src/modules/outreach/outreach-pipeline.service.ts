import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberStatus, OutreachConvertStage } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { BusService } from '../bus/bus.service';
import { MembershipActivityService } from '../membership/membership-activity.service';
import {
  CONVERT_TO_FOLLOW_UP_STAGE,
  OUTREACH_CONVERT_PIPELINE,
} from './outreach.constants';

@Injectable()
export class OutreachPipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: BusService,
    private readonly activity: MembershipActivityService,
  ) {}

  async getPipeline(churchId: string) {
    const grouped = await this.prisma.outreachContact.groupBy({
      by: ['convertStage'],
      where: { churchId, convertStage: { not: 'ARCHIVED' } },
      _count: { id: true },
    });

    const byStage = Object.fromEntries(
      OUTREACH_CONVERT_PIPELINE.map((s) => [
        s,
        grouped.find((g) => g.convertStage === s)?._count.id ?? 0,
      ]),
    ) as Record<OutreachConvertStage, number>;

    const contacts = await this.prisma.outreachContact.findMany({
      where: { churchId, convertStage: { notIn: ['ARCHIVED', 'CONVERTED'] } },
      include: {
        evangelist: { select: { firstName: true, lastName: true } },
        followUp: { select: { id: true, stage: true, assignedToId: true } },
        member: { select: { id: true, firstName: true, lastName: true, status: true } },
      },
      orderBy: { capturedAt: 'desc' },
      take: 80,
    });

    const [needsBusPickup, convertedTotal] = await Promise.all([
      this.prisma.outreachContact.count({
        where: { churchId, needsBusPickup: true, convertStage: { not: 'CONVERTED' } },
      }),
      this.prisma.outreachContact.count({
        where: { churchId, convertStage: 'CONVERTED' },
      }),
    ]);

    return { byStage, contacts, needsBusPickup, convertedTotal };
  }

  async advanceStage(churchId: string, contactId: string, stage: OutreachConvertStage) {
    const contact = await this.assertContact(churchId, contactId);
    if (!OUTREACH_CONVERT_PIPELINE.includes(stage)) {
      throw new BadRequestException('Invalid convert stage');
    }

    const updated = await this.prisma.outreachContact.update({
      where: { id: contactId },
      data: { convertStage: stage },
      include: {
        followUp: true,
        evangelist: { select: { firstName: true, lastName: true } },
      },
    });

    if (contact.followUpId) {
      const followStage = CONVERT_TO_FOLLOW_UP_STAGE[stage];
      if (followStage) {
        await this.prisma.followUp.update({
          where: { id: contact.followUpId },
          data: {
            stage: followStage,
            ...(stage === 'CONVERTED' ? { completedAt: new Date() } : {}),
          },
        });
      }
    }

    return updated;
  }

  async convertToMember(
    churchId: string,
    contactId: string,
    actorUserId?: string,
    opts?: { memberStatus?: MemberStatus },
  ) {
    const contact = await this.assertContact(churchId, contactId);

    if (contact.memberId) {
      const existing = await this.prisma.member.findFirst({
        where: { id: contact.memberId, churchId },
      });
      if (existing) return { member: existing, contact, ride: null, alreadyConverted: true };
    }

    const member = await this.prisma.member.create({
      data: {
        churchId,
        firstName: contact.firstName,
        lastName: contact.lastName ?? '',
        phone: contact.phone,
        email: contact.email,
        status: opts?.memberStatus ?? 'NEW_MEMBER',
        roles: [],
        notes: [
          'Converted from outreach capture.',
          contact.notes,
          contact.voiceNotes,
        ]
          .filter(Boolean)
          .join(' '),
      },
    });

    await this.activity.log(churchId, member.id, 'MEMBER_CREATED', 'Converted from outreach contact', {
      actorUserId,
      metadata: { outreachContactId: contact.id },
    });

    if (contact.followUpId) {
      await this.prisma.followUp.update({
        where: { id: contact.followUpId },
        data: {
          memberId: member.id,
          stage: 'JOINED_GROUP',
          completedAt: new Date(),
        },
      });
    }

    const updatedContact = await this.prisma.outreachContact.update({
      where: { id: contactId },
      data: {
        memberId: member.id,
        convertStage: 'CONVERTED',
        convertedAt: new Date(),
      },
      include: {
        followUp: { select: { id: true, stage: true } },
        member: { select: { id: true, firstName: true, lastName: true, status: true } },
      },
    });

    let ride = null;
    if (contact.needsBusPickup) {
      ride = await this.createBusPickupRide(churchId, member.id, contact);
    }

    return { member, contact: updatedContact, ride, alreadyConverted: false };
  }

  private async createBusPickupRide(
    churchId: string,
    memberId: string,
    contact: {
      pickupAddress: string | null;
      locationLabel: string | null;
      latitude: number | null;
      longitude: number | null;
      busPickupNotes: string | null;
      firstName: string;
      lastName: string | null;
    },
  ) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { name: true, address: true, city: true },
    });
    const pickupAddress =
      contact.pickupAddress?.trim() ||
      contact.locationLabel?.trim() ||
      (contact.latitude != null
        ? `GPS ${contact.latitude.toFixed(5)}, ${contact.longitude?.toFixed(5)}`
        : 'Pickup address TBD — contact outreach team');

    const dropoffAddress =
      [church?.address, church?.city].filter(Boolean).join(', ') ||
      `${church?.name ?? 'Church'} — main campus`;

    const scheduled = new Date();
    scheduled.setDate(scheduled.getDate() + ((7 - scheduled.getDay()) % 7 || 7));
    scheduled.setHours(9, 0, 0, 0);

    return this.bus.createRideRequest(churchId, {
      memberId,
      pickupAddress,
      pickupLat: contact.latitude ?? undefined,
      pickupLng: contact.longitude ?? undefined,
      dropoffAddress,
      scheduledAt: scheduled.toISOString(),
      notes: [
        'Auto-created from outreach bus pickup request.',
        contact.busPickupNotes,
      ]
        .filter(Boolean)
        .join(' '),
    });
  }

  private async assertContact(churchId: string, id: string) {
    const row = await this.prisma.outreachContact.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Outreach contact not found');
    return row;
  }
}
