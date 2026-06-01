import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CHURCH_TENANT_MODULE_IDS,
  CHURCH_TENANT_MODULE_LABELS,
  type ChurchTenantModulesMap,
} from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import { PLATFORM_MARKETING_TEMPLATE_DEFAULTS } from './platform-marketing-defaults';

export interface WelcomeEmailRenderParams {
  churchName: string;
  churchSlug: string;
  roleLabel: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
  enabledModules: ChurchTenantModulesMap;
}

@Injectable()
export class PlatformMarketingService {
  private readonly logger = new Logger(PlatformMarketingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Ensure PostgreSQL enum includes UPSELL (safe if already applied). */
  private async ensureUpsellCategoryEnum() {
    try {
      await this.prisma.$executeRawUnsafe(
        `ALTER TYPE "PlatformEmailTemplateCategory" ADD VALUE IF NOT EXISTS 'UPSELL'`,
      );
    } catch (err) {
      this.logger.debug(
        `UPSELL enum ensure skipped: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /** Insert any default templates that are not yet in the database (preserves user edits). */
  async syncMissingDefaults(): Promise<{ added: number; total: number; slugs: string[] }> {
    await this.ensureUpsellCategoryEnum();
    const existing = await this.prisma.platformEmailTemplate.findMany({
      select: { slug: true },
    });
    const have = new Set(existing.map((r) => r.slug));
    const addedSlugs: string[] = [];

    for (const tpl of PLATFORM_MARKETING_TEMPLATE_DEFAULTS) {
      if (have.has(tpl.slug)) continue;
      try {
        await this.prisma.platformEmailTemplate.create({
          data: {
            slug: tpl.slug,
            name: tpl.name,
            category: tpl.category,
            subject: tpl.subject,
            htmlBody: tpl.htmlBody,
            textBody: tpl.textBody,
            description: tpl.description,
            isDefault: tpl.isDefault,
          },
        });
        addedSlugs.push(tpl.slug);
      } catch (err) {
        this.logger.warn(
          `Could not create marketing template ${tpl.slug}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return {
      added: addedSlugs.length,
      total: PLATFORM_MARKETING_TEMPLATE_DEFAULTS.length,
      slugs: addedSlugs,
    };
  }

  async ensureSeeded() {
    await this.syncMissingDefaults();
    for (const tpl of PLATFORM_MARKETING_TEMPLATE_DEFAULTS) {
      await this.prisma.platformEmailTemplate.upsert({
        where: { slug: tpl.slug },
        create: {
          slug: tpl.slug,
          name: tpl.name,
          category: tpl.category,
          subject: tpl.subject,
          htmlBody: tpl.htmlBody,
          textBody: tpl.textBody,
          description: tpl.description,
          isDefault: tpl.isDefault,
        },
        update: {
          name: tpl.name,
          description: tpl.description,
          category: tpl.category,
        },
      });
    }
    return this.listTemplates();
  }

  async listTemplates() {
    await this.syncMissingDefaults();
    return this.prisma.platformEmailTemplate.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getBySlug(slug: string) {
    const row = await this.prisma.platformEmailTemplate.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException('Email template not found');
    return row;
  }

  async updateTemplate(
    slug: string,
    data: { subject?: string; htmlBody?: string; textBody?: string | null; name?: string },
  ) {
    await this.getBySlug(slug);
    return this.prisma.platformEmailTemplate.update({
      where: { slug },
      data: {
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        name: data.name,
      },
    });
  }

  /** Replace {{tokens}} for preview or outbound mail. */
  renderTemplate(
    html: string,
    subject: string,
    vars: Record<string, string>,
  ): { subject: string; html: string } {
    const replace = (s: string) =>
      Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{{${k}}}`).join(v), s);
    return { subject: replace(subject), html: replace(html) };
  }

  buildModuleListHtml(enabledModules: ChurchTenantModulesMap): string {
    return CHURCH_TENANT_MODULE_IDS.filter((id) => enabledModules[id] !== false)
      .map((id) => {
        const label = CHURCH_TENANT_MODULE_LABELS[id];
        return `<li style="margin-bottom:8px;"><strong>${label}</strong></li>`;
      })
      .join('\n');
  }

  async buildWelcomeEmail(
    params: WelcomeEmailRenderParams,
  ): Promise<{ subject: string; html: string; text: string }> {
    await this.ensureSeeded();
    const tpl =
      (await this.prisma.platformEmailTemplate.findFirst({
        where: { category: 'WELCOME', isDefault: true },
      })) ?? (await this.getBySlug('church-hub-welcome'));

    const vars = await this.buildTemplateVars({
      churchName: params.churchName,
      churchSlug: params.churchSlug,
      roleLabel: params.roleLabel,
      email: params.email,
      tempPassword: params.tempPassword,
      loginUrl: params.loginUrl,
      enabledModules: params.enabledModules,
    });
    const { subject, html } = this.renderTemplate(tpl.htmlBody, tpl.subject, vars);
    const text =
      tpl.textBody ??
      `Welcome to Church_Hub for ${params.churchName}.\n\nEmail: ${params.email}\nTemporary password: ${params.tempPassword}\n\nSign in: ${params.loginUrl}`;

    return { subject, html, text };
  }

  buildLoginUrl(churchSlug: string): string {
    const appUrl =
      process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
    return `${appUrl}/login?church=${encodeURIComponent(churchSlug)}`;
  }

  /** Live license price from Wisdom365+ product config (used in marketing tokens). */
  async getWisdom365PriceLabel(): Promise<string> {
    const config = await this.prisma.wisdom365ProductConfig.findUnique({
      where: { id: 'default' },
    });
    const pence = config?.licensePricePence ?? 1000;
    const currency = config?.currency ?? 'GBP';
    return PlatformMarketingService.formatPenceLabel(pence, currency);
  }

  static formatPenceLabel(pence: number, currency = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(pence / 100);
  }

  private async buildTemplateVars(params: {
    churchName: string;
    churchSlug: string;
    roleLabel?: string;
    email?: string;
    tempPassword?: string;
    loginUrl?: string;
    userFirstName?: string;
    enabledModules?: ChurchTenantModulesMap;
  }): Promise<Record<string, string>> {
    const appUrl =
      process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
    const loginUrl = params.loginUrl ?? this.buildLoginUrl(params.churchSlug);
    const wisdom365Price = await this.getWisdom365PriceLabel();
    return {
      churchName: params.churchName,
      churchSlug: params.churchSlug,
      roleLabel: params.roleLabel ?? 'Church Leader',
      email: params.email ?? '',
      tempPassword: params.tempPassword ?? '',
      loginUrl,
      userFirstName: params.userFirstName ?? 'friend',
      wisdom365Url: `${appUrl}/dashboard/wisdom365?buy=1`,
      spirifyUrl: `${appUrl}/dashboard/communications/sermons`,
      wisdom365Price,
      featureName: '',
      featureSummary: '',
      moduleListHtml: params.enabledModules
        ? this.buildModuleListHtml(params.enabledModules)
        : '',
    };
  }

  /** Render any platform marketing template by slug (email + in-app copy). */
  async buildTemplateEmail(
    slug: string,
    params: {
      churchName: string;
      churchSlug: string;
      roleLabel?: string;
      email?: string;
      loginUrl?: string;
      userFirstName?: string;
      enabledModules?: ChurchTenantModulesMap;
    },
  ): Promise<{
    subject: string;
    html: string;
    text: string;
    inAppTitle: string;
    inAppBody: string;
    vars: Record<string, string>;
  }> {
    await this.ensureSeeded();
    const tpl = await this.getBySlug(slug);
    const vars = await this.buildTemplateVars(params);
    const { subject, html } = this.renderTemplate(tpl.htmlBody, tpl.subject, vars);
    const text =
      tpl.textBody ??
      `${subject}\n\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n\n${vars.loginUrl}`;

    const inAppTitle = subject;
    const plain = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const inAppBody = plain.slice(0, 480) + (plain.length > 480 ? '…' : '');

    return { subject, html, text, inAppTitle, inAppBody, vars };
  }
}
