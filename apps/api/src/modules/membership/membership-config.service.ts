import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';

export const DEFAULT_CLASS_DEFINITIONS = [
  { code: '101', name: 'Membership 101 — Foundations', sortOrder: 1 },
  { code: '201', name: 'Membership 201 — Discipleship', sortOrder: 2 },
  { code: '301', name: 'Membership 301 — Leadership', sortOrder: 3 },
  { code: '401', name: 'Membership 401 — Ministry', sortOrder: 4 },
] as const;

export const DEFAULT_CHURCH_SERVICES = [
  { name: 'Sunday Main Service', dayOfWeek: 0, startTime: '10:00', sortOrder: 1 },
  { name: 'Midweek Bible Study', dayOfWeek: 3, startTime: '19:00', sortOrder: 2 },
] as const;

@Injectable()
export class MembershipConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async listChurchServices(churchId: string) {
    return this.prisma.churchService.findMany({
      where: { churchId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createChurchService(
    churchId: string,
    data: {
      name: string;
      description?: string;
      dayOfWeek?: number;
      startTime?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.churchService.create({
      data: {
        churchId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        dayOfWeek: data.dayOfWeek ?? null,
        startTime: data.startTime?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateChurchService(
    churchId: string,
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      dayOfWeek: number | null;
      startTime: string | null;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    await this.assertChurchService(churchId, id);
    return this.prisma.churchService.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.dayOfWeek !== undefined ? { dayOfWeek: data.dayOfWeek } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async deleteChurchService(churchId: string, id: string) {
    await this.assertChurchService(churchId, id);
    return this.prisma.churchService.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listClassDefinitions(churchId: string) {
    const rows = await this.prisma.membershipClassDefinition.findMany({
      where: { churchId },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    if (rows.length > 0) return rows;
    return this.seedDefaultClassDefinitions(churchId);
  }

  async createClassDefinition(
    churchId: string,
    data: {
      code: string;
      name: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.membershipClassDefinition.create({
      data: {
        churchId,
        code: data.code.trim(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateClassDefinition(
    churchId: string,
    id: string,
    data: Partial<{
      code: string;
      name: string;
      description: string | null;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    await this.assertClassDefinition(churchId, id);
    return this.prisma.membershipClassDefinition.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code.trim() } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async deleteClassDefinition(churchId: string, id: string) {
    await this.assertClassDefinition(churchId, id);
    return this.prisma.membershipClassDefinition.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Idempotent defaults for new churches */
  async seedChurchDefaults(churchId: string) {
    const [serviceCount, classCount] = await Promise.all([
      this.prisma.churchService.count({ where: { churchId } }),
      this.prisma.membershipClassDefinition.count({ where: { churchId } }),
    ]);
    const services =
      serviceCount === 0
        ? await this.prisma.$transaction(
            DEFAULT_CHURCH_SERVICES.map((s) =>
              this.prisma.churchService.create({
                data: { churchId, ...s },
              }),
            ),
          )
        : [];
    const classes =
      classCount === 0 ? await this.seedDefaultClassDefinitions(churchId) : [];
    return { services, classes };
  }

  private async seedDefaultClassDefinitions(churchId: string) {
    return this.prisma.$transaction(
      DEFAULT_CLASS_DEFINITIONS.map((c) =>
        this.prisma.membershipClassDefinition.create({
          data: { churchId, ...c },
        }),
      ),
    );
  }

  private async assertChurchService(churchId: string, id: string) {
    const row = await this.prisma.churchService.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Church service not found');
    return row;
  }

  private async assertClassDefinition(churchId: string, id: string) {
    const row = await this.prisma.membershipClassDefinition.findFirst({
      where: { id, churchId },
    });
    if (!row) throw new NotFoundException('Class definition not found');
    return row;
  }
}
