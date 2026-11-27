import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SecurityAuditService } from '../../common/security/security-audit.service';
import { PrismaService } from '../../prisma/prisma.module';
import { UpdatePlatformSiteTrackingDto } from './dto/platform-site-tracking.dto';
import {
  DEFAULT_GA_MEASUREMENT_ID,
  DEFAULT_GTM_CONTAINER_ID,
  parseSiteTrackingPatch,
  sanitizeSiteTrackingIds,
  type SiteTrackingIds,
} from './site-tracking.ids';

export const PLATFORM_SITE_TRACKING_ID = 'global';

const CACHE_MS = 30_000;

export type PlatformSiteTrackingView = SiteTrackingIds & {
  updatedAt: string | null;
  updatedBy: { id: string; email: string; firstName: string; lastName: string } | null;
};

@Injectable()
export class PlatformSiteTrackingService {
  private cache: { at: number; value: SiteTrackingIds } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  private async ensureRow() {
    return this.prisma.platformSiteTracking.upsert({
      where: { id: PLATFORM_SITE_TRACKING_ID },
      create: {
        id: PLATFORM_SITE_TRACKING_ID,
        gtmContainerId: DEFAULT_GTM_CONTAINER_ID,
        gaMeasurementId: DEFAULT_GA_MEASUREMENT_ID,
      },
      update: {},
      include: {
        updatedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  private toView(row: {
    gtmContainerId: string | null;
    gaMeasurementId: string | null;
    facebookPixelId: string | null;
    googleSiteVerification: string | null;
    updatedAt: Date;
    updatedBy: { id: string; email: string; firstName: string; lastName: string } | null;
  }): PlatformSiteTrackingView {
    return {
      gtmContainerId: row.gtmContainerId,
      gaMeasurementId: row.gaMeasurementId,
      facebookPixelId: row.facebookPixelId,
      googleSiteVerification: row.googleSiteVerification,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    };
  }

  async getPublic(): Promise<SiteTrackingIds> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) {
      return this.cache.value;
    }
    const row = await this.prisma.platformSiteTracking.findUnique({
      where: { id: PLATFORM_SITE_TRACKING_ID },
      select: {
        gtmContainerId: true,
        gaMeasurementId: true,
        facebookPixelId: true,
        googleSiteVerification: true,
      },
    });
    const value = sanitizeSiteTrackingIds(row);
    this.cache = { at: Date.now(), value };
    return value;
  }

  async getAdmin(): Promise<PlatformSiteTrackingView> {
    return this.toView(await this.ensureRow());
  }

  async update(actorId: string, dto: UpdatePlatformSiteTrackingDto): Promise<PlatformSiteTrackingView> {
    let patch: Partial<SiteTrackingIds>;
    try {
      patch = parseSiteTrackingPatch(dto);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid measurement ID');
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No measurement changes were sent');
    }

    const before = await this.ensureRow();
    const row = await this.prisma.platformSiteTracking.update({
      where: { id: PLATFORM_SITE_TRACKING_ID },
      data: {
        ...patch,
        updatedBy: { connect: { id: actorId } },
      },
      include: {
        updatedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    this.cache = null;
    await this.securityAudit.append({
      churchId: null,
      actorId,
      action: 'SITE_TRACKING_UPDATED',
      targetType: 'PLATFORM',
      targetId: PLATFORM_SITE_TRACKING_ID,
      metadata: {
        before: {
          gtmContainerId: before.gtmContainerId,
          gaMeasurementId: before.gaMeasurementId,
          facebookPixelId: before.facebookPixelId,
          googleSiteVerification: before.googleSiteVerification,
        },
        after: patch,
      } as Prisma.InputJsonValue,
    });
    return this.toView(row);
  }
}
