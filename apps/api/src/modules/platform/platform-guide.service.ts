import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PlatformGuideKind, PlatformGuideStatus, Prisma } from '@prisma/client';
import { SecurityAuditService } from '../../common/security/security-audit.service';
import { PrismaService } from '../../prisma/prisma.module';
import { UpsertGuidePageDto } from './dto/platform-guide.dto';
import { GUIDE_SEED, guideBodyHtml, type GuideFaq } from './guide-copy';
import {
  parseCoverImagePath,
  parseGuideSlug,
  plainGuideText,
  publicCoverPath,
  sanitizeGuideHtml,
} from './guide-html';

const publicSelect = {
  slug: true,
  kind: true,
  title: true,
  summary: true,
  seoTitle: true,
  seoDescription: true,
  coverImagePath: true,
  coverImageAlt: true,
  bodyHtml: true,
  faqs: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.PlatformGuidePageSelect;

function faqsFromJson(value: Prisma.JsonValue): GuideFaq[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const question = plainGuideText('question' in item ? String(item.question ?? '') : '', 200);
    const answer = plainGuideText('answer' in item ? String(item.answer ?? '') : '', 800);
    if (question.length < 2 || answer.length < 2) return [];
    return [{ question, answer }];
  });
}

@Injectable()
export class PlatformGuideService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async onModuleInit() {
    const existing = await this.prisma.platformGuidePage.count();
    if (existing > 0) return;
    for (const seed of GUIDE_SEED) {
      await this.prisma.platformGuidePage.create({
        data: {
          kind: seed.kind,
          slug: seed.slug,
          title: seed.title,
          summary: seed.summary,
          seoTitle: seed.seoTitle,
          seoDescription: seed.seoDescription,
          coverImagePath: seed.coverImagePath,
          coverImageAlt: seed.coverImageAlt,
          bodyHtml: sanitizeGuideHtml(guideBodyHtml(seed.paragraphs)),
          faqs: seed.faqs,
          showOnHomepage: seed.kind === 'POST' && seed.showOnHomepage,
          sortOrder: seed.sortOrder,
          status: PlatformGuideStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
    }
  }

  private present<T extends { bodyHtml: string; faqs: Prisma.JsonValue }>(row: T) {
    return {
      ...row,
      bodyHtml: sanitizeGuideHtml(row.bodyHtml),
      faqs: faqsFromJson(row.faqs),
    };
  }

  async listPublishedPosts() {
    const rows = await this.prisma.platformGuidePage.findMany({
      where: { kind: 'POST', status: 'PUBLISHED' },
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
      select: {
        slug: true,
        title: true,
        summary: true,
        coverImagePath: true,
        coverImageAlt: true,
        publishedAt: true,
      },
    });
    return rows.map((row) => ({ ...row, coverImagePath: publicCoverPath(row.coverImagePath) }));
  }

  async listHomepage() {
    const rows = await this.prisma.platformGuidePage.findMany({
      where: { kind: 'POST', status: 'PUBLISHED', showOnHomepage: true },
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
      take: 8,
      select: {
        slug: true,
        title: true,
        summary: true,
        coverImagePath: true,
        coverImageAlt: true,
      },
    });
    return rows.map((row) => ({ ...row, coverImagePath: publicCoverPath(row.coverImagePath) }));
  }

  async listPaths() {
    const rows = await this.prisma.platformGuidePage.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, kind: true, updatedAt: true },
      orderBy: { slug: 'asc' },
    });
    return rows.map((row) => ({
      path: row.kind === 'ABOUT' ? '/about' : `/blog/${row.slug}`,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async getPublished(slug: string) {
    const parsed = this.safeSlug(slug);
    const row = await this.prisma.platformGuidePage.findFirst({
      where: { slug: parsed, status: 'PUBLISHED' },
      select: publicSelect,
    });
    if (!row) throw new NotFoundException('Page not found');
    const related = await this.prisma.platformGuidePage.findMany({
      where: { kind: 'POST', status: 'PUBLISHED', slug: { not: parsed } },
      orderBy: { sortOrder: 'asc' },
      take: 4,
      select: { slug: true, title: true, summary: true, coverImagePath: true, coverImageAlt: true },
    });
    const page = this.present(row);
    return {
      page: { ...page, coverImagePath: publicCoverPath(page.coverImagePath) },
      related: related.map((item) => ({ ...item, coverImagePath: publicCoverPath(item.coverImagePath) })),
    };
  }

  async listAdmin() {
    return this.prisma.platformGuidePage.findMany({
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        kind: true,
        slug: true,
        title: true,
        summary: true,
        status: true,
        showOnHomepage: true,
        sortOrder: true,
        updatedAt: true,
      },
    });
  }

  async getAdmin(id: string) {
    this.assertId(id);
    const row = await this.prisma.platformGuidePage.findFirst({ where: { id } });
    if (!row) throw new NotFoundException('Page not found');
    return row;
  }

  async create(actorId: string, dto: UpsertGuidePageDto) {
    if (!dto.slug || !dto.title || !dto.summary || !dto.bodyHtml || !dto.seoTitle || !dto.seoDescription) {
      throw new BadRequestException('A new article needs a slug, title, summary, search title, search description, and body');
    }
    const slug = parseGuideSlug(dto.slug);
    if (slug === 'about') throw new BadRequestException('The about page already exists');
    const coverImagePath = dto.coverImagePath
      ? parseCoverImagePath(dto.coverImagePath)
      : '/images/blog/church-management-software.svg';
    const coverImageAlt = dto.coverImageAlt?.trim() || dto.title.trim();
    const bodyHtml = sanitizeGuideHtml(dto.bodyHtml);
    const faqs = (dto.faqs ?? [])
      .map((faq) => ({
        question: plainGuideText(faq.question, 200),
        answer: plainGuideText(faq.answer, 800),
      }))
      .filter((faq) => faq.question.length >= 2 && faq.answer.length >= 2);
    try {
      const row = await this.prisma.platformGuidePage.create({
        data: {
          kind: PlatformGuideKind.POST,
          slug,
          title: dto.title.trim(),
          summary: dto.summary.trim(),
          seoTitle: dto.seoTitle.trim(),
          seoDescription: dto.seoDescription.trim(),
          coverImagePath,
          coverImageAlt,
          bodyHtml,
          faqs,
          showOnHomepage: dto.showOnHomepage === true,
          sortOrder: dto.sortOrder ?? 10,
          status: dto.status ?? PlatformGuideStatus.DRAFT,
          publishedAt: dto.status === PlatformGuideStatus.PUBLISHED ? new Date() : null,
        },
      });
      await this.audit(actorId, 'GUIDE_PAGE_CREATED', row.id, { slug });
      return row;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('That address is already in use');
      }
      throw err;
    }
  }

  async update(actorId: string, id: string, dto: UpsertGuidePageDto) {
    const existing = await this.getAdmin(id);
    const slug = dto.slug ? parseGuideSlug(dto.slug) : existing.slug;
    if (existing.kind === 'ABOUT' && slug !== 'about') {
      throw new BadRequestException('The about page keeps its address');
    }
    if (existing.kind === 'POST' && slug === 'about') {
      throw new BadRequestException('That address is reserved for the about page');
    }
    const data = this.toWriteData(dto, slug);
    const status = dto.status ?? existing.status;
    try {
    const row = await this.prisma.platformGuidePage.update({
      where: { id },
      data: {
        ...data,
        slug,
        status,
        showOnHomepage: existing.kind === 'ABOUT' ? false : data.showOnHomepage,
        publishedAt:
          status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : existing.publishedAt,
        updatedBy: { connect: { id: actorId } },
      },
    });
    await this.audit(actorId, 'GUIDE_PAGE_UPDATED', row.id, { slug });
    return row;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('That address is already in use');
      }
      throw err;
    }
  }

  async remove(actorId: string, id: string) {
    const existing = await this.getAdmin(id);
    if (existing.kind === 'ABOUT') {
      throw new BadRequestException('The about page cannot be deleted');
    }
    await this.prisma.platformGuidePage.delete({ where: { id } });
    await this.audit(actorId, 'GUIDE_PAGE_DELETED', id, { slug: existing.slug });
    return { ok: true };
  }

  private toWriteData(dto: UpsertGuidePageDto, slug: string) {
    const data: Prisma.PlatformGuidePageUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.summary !== undefined) data.summary = dto.summary.trim();
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle.trim();
    if (dto.seoDescription !== undefined) data.seoDescription = dto.seoDescription.trim();
    if (dto.coverImagePath !== undefined) data.coverImagePath = parseCoverImagePath(dto.coverImagePath);
    if (dto.coverImageAlt !== undefined) data.coverImageAlt = dto.coverImageAlt.trim();
    if (dto.bodyHtml !== undefined) data.bodyHtml = sanitizeGuideHtml(dto.bodyHtml);
    if (dto.faqs !== undefined) {
      data.faqs = dto.faqs
        .map((faq) => ({
          question: plainGuideText(faq.question, 200),
          answer: plainGuideText(faq.answer, 800),
        }))
        .filter((faq) => faq.question.length >= 2 && faq.answer.length >= 2);
    }
    if (dto.showOnHomepage !== undefined) data.showOnHomepage = dto.showOnHomepage;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.slug !== undefined) data.slug = slug;
    return data;
  }

  private assertId(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundException('Page not found');
    }
  }

  private safeSlug(slug: string): string {
    try {
      return parseGuideSlug(slug);
    } catch (err) {
      throw new NotFoundException(err instanceof Error ? err.message : 'Page not found');
    }
  }

  private audit(actorId: string, action: string, targetId: string, metadata: Prisma.InputJsonValue) {
    return this.securityAudit.append({
      churchId: null,
      actorId,
      action,
      targetType: 'PLATFORM',
      targetId,
      metadata,
    });
  }
}
