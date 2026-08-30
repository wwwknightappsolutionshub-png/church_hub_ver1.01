import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PlatformCmsPageKind,
  PlatformCmsPageStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildCmsSummary,
  DEFAULT_CMS_CONTENT_REVISION,
  DEFAULT_CMS_PAGES,
  parseCmsPublicSummary,
  parseCmsRevision,
} from './platform-cms-defaults';
import { CreateCmsPageDto, SeedCmsDto, UpsertCmsPageDto } from './dto/platform-cms.dto';

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

@Injectable()
export class PlatformCmsService {
  constructor(private readonly prisma: PrismaService) {}

  listAdmin() {
    return this.prisma.platformCmsPage.findMany({
      orderBy: [{ kind: 'asc' }, { title: 'asc' }],
      include: {
        updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  listPublished() {
    return this.prisma.platformCmsPage
      .findMany({
        where: { status: PlatformCmsPageStatus.PUBLISHED },
        orderBy: [{ kind: 'asc' }, { title: 'asc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          kind: true,
          version: true,
          publishedAt: true,
          updatedAt: true,
        },
      })
      .then((pages) =>
        pages.map((p) => ({
          ...p,
          summary: parseCmsPublicSummary(p.summary),
        })),
      );
  }

  async getPublishedBySlug(slug: string) {
    const page = await this.prisma.platformCmsPage.findFirst({
      where: { slug, status: PlatformCmsPageStatus.PUBLISHED },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        htmlBody: true,
        kind: true,
        version: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    if (!page) throw new NotFoundException('Page not found');
    return {
      ...page,
      summary: parseCmsPublicSummary(page.summary),
    };
  }

  async getAdminById(id: string) {
    const page = await this.prisma.platformCmsPage.findUnique({
      where: { id },
      include: {
        updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async seedDefaults(userId?: string, options?: SeedCmsDto) {
    const refreshSystem = options?.refreshSystem !== false;
    const results = [];

    for (const def of DEFAULT_CMS_PAGES) {
      const existing = await this.prisma.platformCmsPage.findUnique({
        where: { slug: def.slug },
      });
      const summary = buildCmsSummary(def.summary, def.contentRevision);

      if (!existing) {
        results.push(
          await this.prisma.platformCmsPage.create({
            data: {
              slug: def.slug,
              title: def.title,
              summary,
              htmlBody: def.htmlBody,
              kind: def.kind,
              isSystem: true,
              status: PlatformCmsPageStatus.PUBLISHED,
              publishedAt: new Date(),
              version: 1,
              updatedById: userId ?? null,
            },
          }),
        );
        continue;
      }

      if (existing.isSystem && refreshSystem) {
        const storedRevision = parseCmsRevision(existing.summary);
        const shouldSync =
          existing.status === PlatformCmsPageStatus.DRAFT ||
          storedRevision === null ||
          storedRevision < def.contentRevision;

        if (shouldSync) {
          const publishing = existing.status !== PlatformCmsPageStatus.PUBLISHED;
          results.push(
            await this.prisma.platformCmsPage.update({
              where: { id: existing.id },
              data: {
                title: def.title,
                summary,
                htmlBody: def.htmlBody,
                kind: def.kind,
                status: PlatformCmsPageStatus.PUBLISHED,
                publishedAt: publishing ? new Date() : existing.publishedAt,
                version: existing.version + 1,
                updatedById: userId ?? null,
              },
            }),
          );
          continue;
        }
      }

      results.push(existing);
    }

    return results;
  }

  async create(userId: string, body: CreateCmsPageDto) {
    const slug = slugify(body.slug);
    if (!slug) throw new BadRequestException('Invalid slug');
    const taken = await this.prisma.platformCmsPage.findUnique({ where: { slug } });
    if (taken) throw new BadRequestException('Slug already in use');

    const status = body.status ?? PlatformCmsPageStatus.DRAFT;
    return this.prisma.platformCmsPage.create({
      data: {
        slug,
        title: body.title.trim(),
        summary: body.summary?.trim() || null,
        htmlBody: body.htmlBody,
        kind: body.kind ?? PlatformCmsPageKind.CUSTOM,
        status,
        isSystem: false,
        version: 1,
        publishedAt: status === PlatformCmsPageStatus.PUBLISHED ? new Date() : null,
        updatedById: userId,
      },
    });
  }

  async update(userId: string, id: string, body: UpsertCmsPageDto) {
    const existing = await this.prisma.platformCmsPage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Page not found');

    const data: Prisma.PlatformCmsPageUpdateInput = {
      updatedBy: { connect: { id: userId } },
    };

    if (body.title !== undefined) data.title = body.title.trim();
    if (body.summary !== undefined) {
      const trimmed = body.summary?.trim() || null;
      if (existing.isSystem && trimmed && !trimmed.startsWith('cms-revision:')) {
        const rev =
          parseCmsRevision(existing.summary) ?? DEFAULT_CMS_CONTENT_REVISION;
        data.summary = buildCmsSummary(trimmed, rev);
      } else {
        data.summary = trimmed;
      }
    }
    if (body.htmlBody !== undefined) data.htmlBody = body.htmlBody;
    if (body.kind !== undefined) data.kind = body.kind;

    if (body.slug !== undefined && !existing.isSystem) {
      const slug = slugify(body.slug);
      if (!slug) throw new BadRequestException('Invalid slug');
      if (slug !== existing.slug) {
        const taken = await this.prisma.platformCmsPage.findUnique({ where: { slug } });
        if (taken) throw new BadRequestException('Slug already in use');
        data.slug = slug;
      }
    }

    const contentChanged =
      body.title !== undefined ||
      body.summary !== undefined ||
      body.htmlBody !== undefined ||
      body.kind !== undefined ||
      (body.slug !== undefined && !existing.isSystem);

    if (contentChanged) {
      data.version = existing.version + 1;
    }

    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === PlatformCmsPageStatus.PUBLISHED && existing.status !== PlatformCmsPageStatus.PUBLISHED) {
        data.publishedAt = new Date();
      }
    }

    return this.prisma.platformCmsPage.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.platformCmsPage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Page not found');
    if (existing.isSystem) {
      throw new BadRequestException('System legal pages cannot be deleted — unpublish instead');
    }
    await this.prisma.platformCmsPage.delete({ where: { id } });
    return { ok: true };
  }

  async resolveDocumentVersion(slug: string): Promise<number> {
    const published = await this.prisma.platformCmsPage.findFirst({
      where: { slug, status: PlatformCmsPageStatus.PUBLISHED },
      select: { version: true },
    });
    if (published) return published.version;
    const any = await this.prisma.platformCmsPage.findUnique({
      where: { slug },
      select: { version: true },
    });
    return any?.version ?? 1;
  }
}
