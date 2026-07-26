import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AutomationEmailTemplateCode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { celebrationEmailShell } from '../communications/celebration-email-shell';

const BRAND = '#1e3a5f';

const SYSTEM_DEFAULTS: Record<
  Exclude<AutomationEmailTemplateCode, 'CUSTOM'>,
  { name: string; subject: string; bodyHtml: string; sortOrder: number }
> = {
  STAFF_WELCOME: {
    name: 'Staff Welcome',
    subject: 'Welcome to {{churchName}} — your ChurchHub account',
    sortOrder: 1,
    bodyHtml: celebrationEmailShell({
      eyebrow: 'ChurchHub Staff',
      headline: 'Welcome aboard, {{firstName}}!',
      subhead: 'Your leadership account is ready',
      bodyHtml: `<p>Dear {{fullName}},</p>
<p>You have been added as <strong>{{roleLabel}}</strong> for <strong>{{churchName}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border-left:4px solid ${BRAND};border-radius:8px;">
<tr><td style="padding:16px 20px;font-family:system-ui,sans-serif;">
<p style="margin:0 0 8px;"><strong>Sign-in email:</strong> {{email}}</p>
<p style="margin:0 0 8px;"><strong>Temporary password:</strong> {{temporaryPassword}}</p>
<p style="margin:0;font-size:13px;color:#64748b;">Please sign in and change your password on first use.</p>
</td></tr></table>
<p>Sign in at your church dashboard to get started.</p>`,
    }),
  },
  ABSENTEE_FOLLOWUP: {
    name: 'Absentee Follow-up',
    subject: 'We missed you at {{churchName}}',
    sortOrder: 2,
    bodyHtml: celebrationEmailShell({
      eyebrow: 'Pastoral Care',
      headline: 'We missed you, {{firstName}}',
      bodyHtml: `<p>Dear {{fullName}},</p><p>We noticed you were not with us recently and wanted to check in. Our team is praying for you.</p>`,
    }),
  },
  NEW_MEMBER_WELCOME: {
    name: 'New Member Welcome',
    subject: 'Welcome to the {{churchName}} family',
    sortOrder: 3,
    bodyHtml: celebrationEmailShell({
      eyebrow: 'Membership',
      headline: 'Welcome, {{firstName}}!',
      bodyHtml: `<p>Dear {{fullName}},</p><p>We are delighted to welcome you into our church family. A leader will connect with you soon.</p>`,
    }),
  },
  WEEKLY_DIGEST: {
    name: 'Weekly Digest',
    subject: '{{churchName}} — weekly ministry update',
    sortOrder: 4,
    bodyHtml: celebrationEmailShell({
      eyebrow: 'Weekly Update',
      headline: 'This week at {{churchName}}',
      bodyHtml: `<p>Hello {{firstName}},</p><p>{{digestBody}}</p>`,
    }),
  },
  EVENT_REMINDER: {
    name: 'Event Reminder',
    subject: 'Reminder: {{eventTitle}} — {{churchName}}',
    sortOrder: 5,
    bodyHtml: celebrationEmailShell({
      eyebrow: 'Events',
      headline: '{{eventTitle}}',
      subhead: '{{eventDate}}',
      bodyHtml: `<p>Dear {{firstName}},</p><p>This is a friendly reminder about <strong>{{eventTitle}}</strong>.</p><p>{{eventDetails}}</p>`,
    }),
  },
  OUTREACH_WELCOME: {
    name: 'Outreach Welcome',
    subject: 'Welcome from {{churchName}}',
    sortOrder: 6,
    bodyHtml: celebrationEmailShell({
      eyebrow: 'Evangelism',
      headline: 'Welcome, {{firstName}}!',
      subhead: 'We are glad you connected with our outreach team',
      bodyHtml: `<p>Dear {{firstName}},</p>
<p>Thank you for taking time to speak with our outreach team today. We are delighted to connect with you and would love to see you at our next service.</p>
<p>If you have any questions, simply reply to this message.</p>
<p style="margin-top:24px;color:#64748b;font-size:14px;">Blessings,<br/><strong>{{churchName}} Evangelism Team</strong></p>`,
    }),
  },
};

export function applyAutomationTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

@Injectable()
export class AutomationEmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults(churchId: string) {
    for (const [code, def] of Object.entries(SYSTEM_DEFAULTS) as Array<
      [Exclude<AutomationEmailTemplateCode, 'CUSTOM'>, (typeof SYSTEM_DEFAULTS)[keyof typeof SYSTEM_DEFAULTS]]
    >) {
      const existing = await this.prisma.automationEmailTemplate.findUnique({
        where: { churchId_code: { churchId, code } },
      });
      if (!existing) {
        await this.prisma.automationEmailTemplate.create({
          data: {
            churchId,
            code,
            name: def.name,
            subject: def.subject,
            bodyHtml: def.bodyHtml,
            isSystem: true,
            sortOrder: def.sortOrder,
          },
        });
      }
    }
  }

  async list(churchId: string) {
    await this.ensureDefaults(churchId);
    return this.prisma.automationEmailTemplate.findMany({
      where: { churchId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getByCode(churchId: string, code: AutomationEmailTemplateCode) {
    await this.ensureDefaults(churchId);
    const row = await this.prisma.automationEmailTemplate.findUnique({
      where: { churchId_code: { churchId, code } },
    });
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  async createCustom(
    churchId: string,
    data: { name: string; subject: string; bodyHtml: string },
  ) {
    if (!data.name?.trim() || !data.subject?.trim()) {
      throw new BadRequestException('Name and subject are required');
    }
    return this.prisma.automationEmailTemplate.create({
      data: {
        churchId,
        code: AutomationEmailTemplateCode.CUSTOM,
        name: data.name.trim(),
        subject: data.subject.trim(),
        bodyHtml: data.bodyHtml ?? '',
        isSystem: false,
        sortOrder: 99,
      },
    });
  }

  async update(
    churchId: string,
    id: string,
    data: Partial<{ name: string; subject: string; bodyHtml: string; isActive: boolean }>,
  ) {
    const row = await this.prisma.automationEmailTemplate.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Template not found');
    return this.prisma.automationEmailTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.subject !== undefined ? { subject: data.subject.trim() } : {}),
        ...(data.bodyHtml !== undefined ? { bodyHtml: data.bodyHtml } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async remove(churchId: string, id: string) {
    const row = await this.prisma.automationEmailTemplate.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Template not found');
    if (row.isSystem) throw new BadRequestException('System templates cannot be deleted');
    await this.prisma.automationEmailTemplate.delete({ where: { id } });
    return { success: true };
  }

  async render(
    churchId: string,
    code: AutomationEmailTemplateCode,
    vars: Record<string, string>,
  ) {
    const tpl = await this.getByCode(churchId, code);
    if (!tpl.isActive) throw new BadRequestException('Template is inactive');
    return {
      subject: applyAutomationTemplate(tpl.subject, vars),
      bodyHtml: applyAutomationTemplate(tpl.bodyHtml, vars),
    };
  }
}
