import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import {
  BRANDED_ANNIVERSARY_BODY,
  BRANDED_BIRTHDAY_BODY,
} from './celebration-email-shell';

export type CelebrationTemplateKind = 'BIRTHDAY' | 'ANNIVERSARY';

const DEFAULTS: Record<CelebrationTemplateKind, { subject: string; bodyHtml: string }> = {
  BIRTHDAY: {
    subject: 'Happy Birthday, {{firstName}}! — {{churchName}}',
    bodyHtml: BRANDED_BIRTHDAY_BODY,
  },
  ANNIVERSARY: {
    subject: 'Celebrating {{occasionName}} with you — {{churchName}}',
    bodyHtml: BRANDED_ANNIVERSARY_BODY,
  },
};

export function applyCelebrationTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

@Injectable()
export class CelebrationEmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private templates() {
    return (this.prisma as unknown as {
      celebrationEmailTemplate: {
        findUnique: (args: object) => Promise<Record<string, unknown> | null>;
        findFirst: (args: object) => Promise<Record<string, unknown> | null>;
        findMany: (args: object) => Promise<Record<string, unknown>[]>;
        create: (args: object) => Promise<Record<string, unknown>>;
        update: (args: object) => Promise<Record<string, unknown>>;
      };
    }).celebrationEmailTemplate;
  }

  async ensureDefaults(churchId: string) {
    for (const kind of ['BIRTHDAY', 'ANNIVERSARY'] as CelebrationTemplateKind[]) {
      const existing = await this.templates().findUnique({
        where: { churchId_kind: { churchId, kind } },
      });
      if (!existing) {
        const d = DEFAULTS[kind];
        await this.templates().create({
          data: { churchId, kind, subject: d.subject, bodyHtml: d.bodyHtml },
        });
      }
    }
  }

  async list(churchId: string) {
    await this.ensureDefaults(churchId);
    return this.templates().findMany({
      where: { churchId },
      orderBy: { kind: 'asc' },
    });
  }

  async update(
    churchId: string,
    kind: CelebrationTemplateKind,
    data: { subject?: string; bodyHtml?: string; isActive?: boolean; autoSend?: boolean },
  ) {
    await this.ensureDefaults(churchId);
    const row = await this.templates().findUnique({
      where: { churchId_kind: { churchId, kind } },
    });
    if (!row) throw new NotFoundException('Template not found');
    return this.templates().update({
      where: { id: row.id as string },
      data,
    });
  }

  async getActive(churchId: string, kind: CelebrationTemplateKind) {
    await this.ensureDefaults(churchId);
    return this.templates().findFirst({
      where: { churchId, kind, isActive: true, autoSend: true },
    }) as Promise<{ subject: string; bodyHtml: string } | null>;
  }
}
