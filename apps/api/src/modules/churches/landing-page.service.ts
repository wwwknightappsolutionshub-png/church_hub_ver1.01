import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  LANDING_TEMPLATE_META,
  buildDefaultLandingPublicDomain,
  churchLandingContentSchema,
  createDefaultChurchLanding,
  isDefaultLandingPublicDomain,
  landingBrandingPatchSchema,
  landingPublicSiteUrl,
  normalizeChurchLanding,
  normalizeLandingPublicDomain,
  ensureSocialFeedWithSamples,
  sanitizeChurchLandingForSave,
  type ChurchLandingContent,
  type ChurchLandingAdminDto,
  type LandingTemplateId,
  type PublicChurchLandingDto,
} from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import { LandingMembershipService } from './landing-membership.service';
import { CommunitySupportService } from '../community-support/community-support.service';

const SETTINGS_LANDING_KEY = 'landing';
const SETTINGS_PUBLIC_DOMAIN_KEY = 'landingPublicDomain';

@Injectable()
export class LandingPageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly landingMembership: LandingMembershipService,
    private readonly communitySupport: CommunitySupportService,
  ) {}

  private resolvePublicDomain(settings: unknown, slug: string) {
    const raw = settings as Prisma.JsonObject | null;
    const stored = raw?.[SETTINGS_PUBLIC_DOMAIN_KEY];
    const defaultPublicDomain = buildDefaultLandingPublicDomain(slug);
    let publicDomain = defaultPublicDomain;
    if (typeof stored === 'string' && stored.trim()) {
      try {
        publicDomain = normalizeLandingPublicDomain(stored, slug);
      } catch {
        publicDomain = defaultPublicDomain;
      }
    }
    return {
      publicDomain,
      defaultPublicDomain,
      publicSiteUrl: landingPublicSiteUrl(publicDomain),
      publicPath: `/c/${slug}`,
    };
  }

  private readLanding(settings: unknown, churchName: string): ChurchLandingContent {
    const raw = settings as Prisma.JsonObject | null;
    const stored = raw?.[SETTINGS_LANDING_KEY];
    if (!stored || typeof stored !== 'object') {
      return createDefaultChurchLanding(churchName);
    }
    const storedRecord = { ...(stored as Record<string, unknown>) };
    if (storedRecord.socialFeed && typeof storedRecord.socialFeed === 'object') {
      const migrated = ensureSocialFeedWithSamples(
        storedRecord.socialFeed as Parameters<typeof ensureSocialFeedWithSamples>[0],
        churchName,
      );
      if (migrated) storedRecord.socialFeed = migrated;
    }
    const parsed = churchLandingContentSchema.safeParse(storedRecord);
    if (!parsed.success) {
      return normalizeChurchLanding(createDefaultChurchLanding(churchName), churchName);
    }
    return normalizeChurchLanding(parsed.data, churchName);
  }

  private async toPublic(church: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    city: string | null;
    country: string | null;
    settings: unknown;
  }): Promise<PublicChurchLandingDto> {
    const landing = this.readLanding(church.settings, church.name);
    if (!landing.published) {
      throw new NotFoundException('Church landing page is not published');
    }
    const domain = this.resolvePublicDomain(church.settings, church.slug);
    const section = landing.communitySupport;
    const showCommunity = section?.enabled !== false;
    const communitySupportItems = showCommunity
      ? await this.loadApprovedCommunitySupport(church.id)
      : [];

    return {
      churchName: church.name,
      slug: church.slug,
      logoUrl: church.logoUrl,
      ...domain,
      city: church.city,
      country: church.country,
      landing,
      communitySupportItems,
    };
  }

  private async loadApprovedCommunitySupport(churchId: string) {
    const rows = await this.prisma.communitySupportRequest.findMany({
      where: { churchId, status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
      take: 48,
    });
    return rows.map((row) => ({
      id: row.id,
      requestType: row.requestType,
      title: row.title,
      summary:
        row.description.length > 220
          ? `${row.description.slice(0, 217).trim()}…`
          : row.description,
      location: row.location ?? undefined,
      contactHint: row.skills ?? undefined,
      dateLabel: row.approvedAt
        ? row.approvedAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : undefined,
    }));
  }

  async getPublicBySlug(slug: string): Promise<PublicChurchLandingDto> {
    const church = await this.prisma.church.findUnique({ where: { slug, isActive: true } });
    if (!church) throw new NotFoundException('Church not found');
    return await this.toPublic(church);
  }

  async getAdmin(churchId: string): Promise<ChurchLandingAdminDto> {
    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');
    const landing = this.readLanding(church.settings, church.name);
    const domain = this.resolvePublicDomain(church.settings, church.slug);
    return {
      churchName: church.name,
      slug: church.slug,
      logoUrl: church.logoUrl,
      ...domain,
      city: church.city,
      country: church.country,
      landing,
      templates: LANDING_TEMPLATE_META,
    };
  }

  async updateBranding(churchId: string, body: unknown): Promise<ChurchLandingAdminDto> {
    const parsed = landingBrandingPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');

    const settings = (church.settings as Prisma.JsonObject) ?? {};
    const data: Prisma.ChurchUpdateInput = {};

    if (parsed.data.publicDomain !== undefined) {
      let custom: string | null = null;
      const rawDomain = parsed.data.publicDomain;
      if (
        rawDomain !== null &&
        String(rawDomain).trim() &&
        !isDefaultLandingPublicDomain(String(rawDomain), church.slug)
      ) {
        try {
          custom = normalizeLandingPublicDomain(String(rawDomain), church.slug);
        } catch (err) {
          throw new BadRequestException(
            err instanceof Error ? err.message : 'Invalid public domain',
          );
        }
      }
      const defaultDomain = buildDefaultLandingPublicDomain(church.slug);
      settings[SETTINGS_PUBLIC_DOMAIN_KEY] =
        custom && custom !== defaultDomain ? custom : null;
    }

    if (parsed.data.logoUrl !== undefined) {
      const url = parsed.data.logoUrl?.trim();
      if (url?.startsWith('data:') || url?.startsWith('blob:')) {
        throw new BadRequestException(
          'Logo must be uploaded to the server — use Upload logo, not an embedded image.',
        );
      }
      data.logoUrl = url || null;
    }

    data.settings = settings as Prisma.InputJsonValue;

    await this.prisma.church.update({
      where: { id: churchId },
      data,
    });

    return this.getAdmin(churchId);
  }

  private async notifyLandingPublished(
    churchId: string,
    slug: string,
    churchName: string,
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: 'ADMIN' } } },
      },
      select: { id: true },
    });

    const title = 'Landing page published';
    const domain = this.resolvePublicDomain(
      (await this.prisma.church.findUnique({ where: { id: churchId } }))?.settings,
      slug,
    );
    const body = `${churchName} landing page is live at ${domain.publicSiteUrl} (also /c/${slug}).`;

    await Promise.all(
      admins.map((user) =>
        this.prisma.notification.create({
          data: {
            churchId,
            userId: user.id,
            type: 'LANDING_PAGE_PUBLISHED',
            title,
            body,
            data: {
              slug,
              publicPath: `/c/${slug}`,
              publicDomain: domain.publicDomain,
              publicSiteUrl: domain.publicSiteUrl,
            } as Prisma.InputJsonValue,
          },
        }),
      ),
    );
  }

  private parseLandingSaveBody(body: unknown): {
    landing: unknown;
    branding?: unknown;
  } {
    if (!body || typeof body !== 'object') {
      return { landing: body };
    }
    const raw = body as Record<string, unknown>;
    if (
      raw.landing &&
      typeof raw.landing === 'object' &&
      'templateId' in (raw.landing as Record<string, unknown>)
    ) {
      return { landing: raw.landing, branding: raw.branding };
    }
    if ('templateId' in raw) {
      return { landing: body };
    }
    return { landing: body };
  }

  async update(churchId: string, body: unknown): Promise<ChurchLandingAdminDto> {
    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');

    const { landing: landingBody, branding } = this.parseLandingSaveBody(body);

    const current = this.readLanding(church.settings, church.name);
    const merged =
      landingBody && typeof landingBody === 'object'
        ? { ...current, ...(landingBody as ChurchLandingContent) }
        : current;
    const withPublish = sanitizeChurchLandingForSave(merged, church.name);

    const parsed = churchLandingContentSchema.safeParse(withPublish);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const settings = (church.settings as Prisma.JsonObject) ?? {};
    await this.prisma.church.update({
      where: { id: churchId },
      data: {
        settings: {
          ...settings,
          [SETTINGS_LANDING_KEY]: normalizeChurchLanding(
            parsed.data,
            church.name,
          ) as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
      },
    });

    if (parsed.data.published) {
      await this.notifyLandingPublished(churchId, church.slug, church.name);
    }

    if (branding) {
      try {
        return await this.updateBranding(churchId, branding);
      } catch (err) {
        // Landing content already saved; surface branding errors clearly
        if (err instanceof BadRequestException) throw err;
        throw err;
      }
    }

    return this.getAdmin(churchId);
  }

  async applyTemplate(
    churchId: string,
    templateId: LandingTemplateId,
  ): Promise<ChurchLandingAdminDto> {
    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');

    const current = this.readLanding(church.settings, church.name);
    const next = createDefaultChurchLanding(church.name, templateId);
    const merged: ChurchLandingContent = normalizeChurchLanding(
      {
        ...next,
        templateId,
        published: current.published,
        heroSlides: next.heroSlides,
        contact: { ...next.contact, ...current.contact },
        social: { ...next.social, ...current.social },
        socialFeed: current.socialFeed ?? next.socialFeed,
      },
      church.name,
    );

    const settings = (church.settings as Prisma.JsonObject) ?? {};
    await this.prisma.church.update({
      where: { id: churchId },
      data: {
        settings: {
          ...settings,
          [SETTINGS_LANDING_KEY]: merged as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
      },
    });

    return this.getAdmin(churchId);
  }

  seedDefaultForNewChurch(churchName: string): Prisma.InputJsonValue {
    return {
      [SETTINGS_LANDING_KEY]: createDefaultChurchLanding(churchName, 'classic'),
    } as Prisma.InputJsonValue;
  }
}
