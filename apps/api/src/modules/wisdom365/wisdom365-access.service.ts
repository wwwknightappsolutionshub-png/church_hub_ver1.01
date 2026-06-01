import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseTenantModulesFromSettings } from '@church-hub/shared-types';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class Wisdom365AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertChurchMember(user: AuthUser) {
    if (!user.churchId) {
      throw new ForbiddenException('Wisdom365+ requires a church member account');
    }
    return user.churchId;
  }

  async getChurchGate(churchId: string) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { settings: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    const modules = parseTenantModulesFromSettings(church.settings);
    const moduleEnabled = modules.wisdom365Plus === true;

    const availability = await this.prisma.wisdom365ChurchAvailability.findUnique({
      where: { churchId },
    });

    return {
      moduleEnabled,
      churchAvailable: availability?.isAvailable ?? true,
    };
  }

  async assertCanAccessWisdom365(user: AuthUser) {
    const churchId = await this.assertChurchMember(user);
    const gate = await this.getChurchGate(churchId);
    if (!gate.moduleEnabled) {
      throw new ForbiddenException('Wisdom365+ is not enabled for your church');
    }
    if (!gate.churchAvailable) {
      throw new ForbiddenException('Wisdom365+ is not available for your church at this time');
    }
    return { churchId, ...gate };
  }

  dayOfYear(date = new Date()): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  dateKey(date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }

  assertDayAccess(requestedDay: number, todayDay = this.dayOfYear()) {
    if (requestedDay > todayDay) {
      throw new BadRequestException('Future daily nuggets cannot be accessed');
    }
    const minDay = Math.max(1, todayDay - 29);
    if (requestedDay < minDay) {
      throw new BadRequestException('Only the past 30 days of nuggets are available');
    }
  }
}
