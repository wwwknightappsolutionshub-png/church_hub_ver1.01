import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailAdapter } from '../../modules/notifications/adapters/email.adapter';
import { marketingEmailShell } from '../../modules/platform/platform-marketing-email-shell';
import { SecurityAuditService } from './security-audit.service';

type DenialInput = {
  actorId?: string | null;
  churchId?: string | null;
  ip?: string | null;
  route?: string;
  reason?: string;
  required?: string | string[];
  gate?: string;
};

/**
 * Records AUTHZ_DENIED audit events and fires abuse alerts when a sliding
 * window threshold is exceeded (default 10 / 15 min per actor or IP).
 *
 * Counting uses the DB (`countSince`) so multi-instance deployments cannot
 * bypass the threshold. In-memory maps only dedupe write storms and alert spam.
 */
@Injectable()
export class AuthzDenialService {
  private readonly logger = new Logger(AuthzDenialService.name);
  /** Dedupe AUTHZ_DENIED appends: max 1 per actor|route (or ip|route) per interval. */
  private readonly recentWrites = new Map<string, number>();
  /** Dedupe abuse alerts per key for one window. */
  private readonly alerted = new Map<string, number>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
    private readonly email: EmailAdapter,
  ) {}

  private threshold() {
    const n = parseInt(this.config.get<string>('AUTHZ_ABUSE_THRESHOLD') ?? '10', 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  }

  private windowMs() {
    const mins = parseInt(this.config.get<string>('AUTHZ_ABUSE_WINDOW_MINUTES') ?? '15', 10);
    return (Number.isFinite(mins) && mins > 0 ? mins : 15) * 60_000;
  }

  private writeDedupeMs() {
    const sec = parseInt(this.config.get<string>('AUTHZ_DENIED_DEDUPE_SECONDS') ?? '5', 10);
    return (Number.isFinite(sec) && sec >= 0 ? sec : 5) * 1000;
  }

  /** Fire-and-forget from guards — never throws to callers. */
  recordDenial(input: DenialInput): void {
    void this.recordDenialAsync(input).catch((err) =>
      this.logger.warn(
        `authz denial handling failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  async recordDenialAsync(input: DenialInput) {
    const now = Date.now();
    const windowMs = this.windowMs();
    const threshold = this.threshold();
    const dedupeMs = this.writeDedupeMs();

    const writeKey = `${input.actorId ?? 'anon'}|${input.ip ?? ''}|${input.route ?? ''}|${input.gate ?? ''}`;
    const lastWrite = this.recentWrites.get(writeKey) ?? 0;
    const shouldAppend = dedupeMs === 0 || now - lastWrite >= dedupeMs;
    if (shouldAppend) {
      this.recentWrites.set(writeKey, now);
      if (this.recentWrites.size > 10_000) {
        const oldest = this.recentWrites.keys().next().value;
        if (oldest) this.recentWrites.delete(oldest);
      }
      await this.audit.append({
        churchId: input.churchId ?? null,
        actorId: input.actorId ?? null,
        action: 'AUTHZ_DENIED',
        targetType: 'Authz',
        targetId: input.gate ?? input.route ?? null,
        ip: input.ip ?? null,
        metadata: {
          route: input.route,
          reason: input.reason,
          required: input.required,
          gate: input.gate,
        },
      });
    }

    const since = new Date(now - windowMs);
    const [actorCount, ipCount] = await Promise.all([
      input.actorId
        ? this.audit.countSince({
            actorId: input.actorId,
            action: 'AUTHZ_DENIED',
            since,
          })
        : Promise.resolve(0),
      input.ip
        ? this.audit.countSince({
            ip: input.ip,
            action: 'AUTHZ_DENIED',
            since,
          })
        : Promise.resolve(0),
    ]);

    const actorTriggered = actorCount >= threshold;
    const ipTriggered = ipCount >= threshold;
    if (!actorTriggered && !ipTriggered) return;

    const alertKey = actorTriggered ? `actor:${input.actorId}` : `ip:${input.ip}`;
    const last = this.alerted.get(alertKey) ?? 0;
    if (now - last < windowMs) return;
    this.alerted.set(alertKey, now);

    await this.emitAbuseAlert({
      ...input,
      actorCount,
      ipCount,
      threshold,
      windowMs,
      triggeredBy: actorTriggered ? 'actor' : 'ip',
    });
  }

  private async emitAbuseAlert(
    input: DenialInput & {
      actorCount: number;
      ipCount: number;
      threshold: number;
      windowMs: number;
      triggeredBy: 'actor' | 'ip';
    },
  ) {
    const churchId = input.churchId ?? null;
    const actor = input.actorId
      ? await this.prisma.user.findFirst({
          where: { id: input.actorId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            churchId: true,
            roles: { include: { role: { select: { name: true } } } },
          },
        })
      : null;

    const roleNames = actor?.roles.map((r) => r.role.name).join(', ') || 'unknown';
    const abuserName = actor
      ? `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim() || actor.email
      : 'Unknown user';
    const abuserEmail = actor?.email ?? 'n/a';
    const effectiveChurchId = churchId ?? actor?.churchId ?? null;

    await this.audit.append({
      churchId: effectiveChurchId,
      actorId: input.actorId ?? null,
      action: 'AUTHZ_ABUSE_DETECTED',
      targetType: 'Authz',
      targetId: input.actorId ?? input.ip ?? null,
      ip: input.ip ?? null,
      metadata: {
        triggeredBy: input.triggeredBy,
        actorCount: input.actorCount,
        ipCount: input.ipCount,
        threshold: input.threshold,
        windowMinutes: Math.round(input.windowMs / 60_000),
        abuserName,
        abuserEmail,
        abuserRoles: roleNames,
        route: input.route,
      },
    });

    if (!effectiveChurchId) {
      this.logger.warn(
        `AUTHZ_ABUSE_DETECTED without churchId (actor=${input.actorId} ip=${input.ip})`,
      );
      return;
    }

    const staff = await this.prisma.user.findMany({
      where: {
        churchId: effectiveChurchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true, email: true, firstName: true },
    });

    const title = 'Security alert: repeated unauthorized access attempts';
    const body = [
      `Church_Hub detected repeated permission denials (${input.threshold}+ in ${Math.round(input.windowMs / 60_000)} minutes).`,
      `Abuser: ${abuserName}`,
      `Email: ${abuserEmail}`,
      `Role(s): ${roleNames}`,
      input.ip ? `IP: ${input.ip}` : null,
      input.route ? `Last route: ${input.route}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    if (staff.length) {
      await this.prisma.notification.createMany({
        data: staff.map((u) => ({
          id: randomUUID(),
          churchId: effectiveChurchId,
          userId: u.id,
          title,
          body,
          type: 'SECURITY_ALERT',
          data: {
            kind: 'AUTHZ_ABUSE',
            actorId: input.actorId,
            ip: input.ip,
          } as Prisma.InputJsonValue,
        })),
      });
    }

    const html = marketingEmailShell({
      eyebrow: 'Church_Hub Security',
      headline: 'Unauthorized access spike detected',
      subhead: 'Repeated permission denials on your church account',
      bodyHtml: `
        <p>Hi {{firstName}},</p>
        <p>Church_Hub detected <strong>${input.threshold}+ unauthorized access attempts</strong> within
        ${Math.round(input.windowMs / 60_000)} minutes on your church workspace.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;border:1px solid #e2e8f0;border-radius:8px;">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;"><strong>Name</strong></td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">${escapeHtml(abuserName)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;"><strong>Email</strong></td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">${escapeHtml(abuserEmail)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;"><strong>Role(s)</strong></td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">${escapeHtml(roleNames)}</td></tr>
          <tr><td style="padding:12px 16px;"><strong>IP</strong></td><td style="padding:12px 16px;">${escapeHtml(input.ip ?? 'n/a')}</td></tr>
        </table>
        <p>Review the Audit &amp; Activity Logs page in Settings for details. If this was unexpected, reset the user’s password and review their role assignments.</p>
        <p style="color:#64748b;font-size:13px;">— Church_Hub Security</p>
      `,
    }).replace(/\{\{churchName\}\}/g, 'Security');

    for (const u of staff) {
      try {
        await this.email.send({
          churchId: effectiveChurchId,
          to: u.email,
          subject: `[Church_Hub] Security alert — unauthorized access spike`,
          body: `Hi ${u.firstName},\n\n${body}\n\n— Church_Hub Security`,
          html: html.replace(/\{\{firstName\}\}/g, escapeHtml(u.firstName || 'there')),
          purpose: 'auth',
        });
      } catch (err) {
        this.logger.warn(
          `Abuse alert email failed for ${u.email}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
