import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { MembershipAnalyticsService } from './membership-analytics.service';
import { SecurityAuditService } from '../../common/security/security-audit.service';
import { MembershipAnalyticsQuery } from './membership-analytics-query';

const SETTINGS_DIGEST_KEY = 'analyticsDigest';
const CHECK_MS = 15 * 60 * 1000;

@Injectable()
export class MembershipAnalyticsDigestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MembershipAnalyticsDigestService.name);
  private timer: NodeJS.Timeout | null = null;
  private lastSentKey = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: MembershipAnalyticsService,
    private readonly email: EmailAdapter,
    private readonly audit: SecurityAuditService,
  ) {}

  onModuleInit() {
    if (process.env.ANALYTICS_DIGEST_ENABLED === 'false') {
      this.logger.warn('Analytics digest scheduler disabled');
      return;
    }
    this.timer = setInterval(() => {
      void this.tick().catch((err) => this.logger.error('Digest tick failed', err));
    }, CHECK_MS);
    this.logger.log('Analytics digest scheduler started');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const now = new Date();
    const weekday = now.getUTCDay();
    const hourUtc = now.getUTCHours();
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true, name: true, settings: true },
    });

    for (const church of churches) {
      const settings = (church.settings as Record<string, unknown> | null) ?? {};
      const digest = (settings[SETTINGS_DIGEST_KEY] as Record<string, unknown> | undefined) ?? {};
      if (digest.enabled !== true) continue;
      const digestWeekday = typeof digest.weekday === 'number' ? digest.weekday : 1;
      const digestHour = typeof digest.hourUtc === 'number' ? digest.hourUtc : 8;
      if (weekday !== digestWeekday || hourUtc !== digestHour) continue;

      const recipients = Array.isArray(digest.recipientEmails)
        ? digest.recipientEmails.filter((e): e is string => typeof e === 'string' && e.includes('@'))
        : [];
      if (recipients.length === 0) continue;

      const slotKey = `${church.id}:${now.toISOString().slice(0, 13)}`;
      if (this.lastSentKey === slotKey) continue;

      const query: MembershipAnalyticsQuery = {
        months: 1,
        dateFrom: null,
        dateTo: null,
        compare: false,
        status: null,
        followUpStage: null,
        outreachStage: null,
        serviceUnitId: null,
        provinceId: null,
        branchId: null,
        serviceType: 'all',
        gender: null,
        ageBand: null,
        family: 'all',
      };

      const dash = await this.analytics.getDashboard(church.id, query);
      const ops = dash.establishmentOps;
      const subject = `${church.name} — Weekly growth snapshot`;
      const body = [
        `Weekly analytics snapshot for ${church.name}`,
        '',
        `Total members: ${dash.summary.totalMembers}`,
        `Active members: ${dash.summary.activeMembers}`,
        `Outreach contacts (period): ${dash.summary.outreachContacts}`,
        `Establishment completion rate: ${Math.round(dash.summary.followUpCompletionRate * 100)}%`,
        '',
        'Establishment ops:',
        `• Overdue: ${ops.overdue}`,
        `• Due today: ${ops.dueToday}`,
        `• Archive requests: ${ops.archiveRequested}`,
        `• Joined Group (day 6+): ${ops.joinedGroupDay6}`,
        '',
        `Cells: ${dash.cellGrowth.activeBranches} branches, ${dash.cellGrowth.membersInCells} members in cells`,
        '',
        'Open your dashboard for details.',
      ].join('\n');

      for (const to of recipients) {
        try {
          await this.email.send({
            to,
            subject,
            body,
            churchId: church.id,
            purpose: 'reports',
          });
        } catch (err) {
          this.logger.warn(
            `Digest email failed for ${church.id} → ${to}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }

      await this.audit.append({
        churchId: church.id,
        actorId: null,
        action: 'ANALYTICS_DIGEST_SENT',
        targetType: 'Church',
        targetId: church.id,
        metadata: { recipientCount: recipients.length },
      });

      this.lastSentKey = slotKey;
    }
  }
}