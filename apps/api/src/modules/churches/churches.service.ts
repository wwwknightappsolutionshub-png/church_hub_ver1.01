import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class ChurchesService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(slug: string) {
    const church = await this.prisma.church.findUnique({ where: { slug } });
    if (!church) throw new NotFoundException('Church not found');
    return church;
  }

  async updateSettings(churchId: string, settings: Record<string, unknown>) {
    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');
    return this.prisma.church.update({
      where: { id: churchId },
      data: { settings: { ...(church.settings as Prisma.JsonObject), ...settings } as Prisma.InputJsonValue },
    });
  }
}
