import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityAuditService } from '../../common/security/security-audit.service';

export type CreateCampaignInput = {
  name: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
  isDefault?: boolean;
};

@Injectable()
export class OutreachCampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  async list(churchId: string, activeOnly = false) {
    return this.prisma.outreachCampaign.findMany({
      where: {
        churchId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async resolveCampaignForCapture(churchId: string, campaignId?: string | null) {
    if (campaignId) {
      const row = await this.prisma.outreachCampaign.findFirst({
        where: { id: campaignId, churchId, isActive: true },
        select: { id: true },
      });
      if (!row) throw new BadRequestException('Campaign not found or inactive');
      return campaignId;
    }
    const def = await this.prisma.outreachCampaign.findFirst({
      where: { churchId, isActive: true, isDefault: true },
      select: { id: true },
    });
    return def?.id ?? null;
  }

  async create(churchId: string, actorId: string, input: CreateCampaignInput) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Campaign name is required');

    if (input.isDefault) {
      await this.prisma.outreachCampaign.updateMany({
        where: { churchId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const row = await this.prisma.outreachCampaign.create({
      data: {
        churchId,
        name,
        description: input.description?.trim() || null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
        createdById: actorId,
      },
    });

    await this.audit.append({
      churchId,
      actorId,
      action: 'OUTREACH_CAMPAIGN_CREATED',
      targetType: 'Other',
      targetId: row.id,
      metadata: { name: row.name },
    });

    return row;
  }

  async update(
    churchId: string,
    actorId: string,
    id: string,
    input: Partial<CreateCampaignInput>,
  ) {
    const existing = await this.prisma.outreachCampaign.findFirst({
      where: { id, churchId },
    });
    if (!existing) throw new NotFoundException('Campaign not found');

    if (input.isDefault) {
      await this.prisma.outreachCampaign.updateMany({
        where: { churchId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const row = await this.prisma.outreachCampaign.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
          : {}),
        ...(input.endsAt !== undefined
          ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
    });

    await this.audit.append({
      churchId,
      actorId,
      action: 'OUTREACH_CAMPAIGN_UPDATED',
      targetType: 'Other',
      targetId: row.id,
    });

    return row;
  }
}