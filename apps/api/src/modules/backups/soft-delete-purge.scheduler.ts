import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.module';
import { runWithTenantBypassAsync } from '../../prisma/tenant-context';
import { SecurityAuditService } from '../../common/security/security-audit.service';

/**
 * Opt-in permanent purge of soft-deleted Member / PastoralNote after retention window.
 * Disabled unless ENABLE_SOFT_DELETE_PURGE=true.
 */
@Injectable()
export class SoftDeletePurgeScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SoftDeletePurgeScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  onModuleInit() {
    const enabled = ['1', 'true', 'yes', 'on'].includes(
      (this.config.get<string>('ENABLE_SOFT_DELETE_PURGE') ?? '').toLowerCase(),
    );
    if (!enabled) {
      this.logger.log('Soft-delete purge scheduler disabled (ENABLE_SOFT_DELETE_PURGE!=true)');
      return;
    }
    this.timer = setInterval(() => {
      void this.purgeOnce().catch((err) =>
        this.logger.warn(`Soft-delete purge failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 60 * 60_000);
    this.logger.log('Soft-delete purge scheduler started (hourly)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async purgeOnce() {
    const days = parseInt(
      this.config.get<string>('BACKUP_SOFT_DELETE_RETENTION_DAYS') ?? '30',
      10,
    );
    const cutoff = new Date(Date.now() - Math.max(1, days) * 86_400_000);

    return runWithTenantBypassAsync(async () => {
      const notes = await this.prisma.pastoralNote.findMany({
        where: { deletedAt: { lte: cutoff } },
        select: { id: true, churchId: true },
        take: 200,
      });
      for (const n of notes) {
        await this.prisma.pastoralNote.delete({ where: { id: n.id } });
        await this.audit.append({
          churchId: n.churchId,
          actorId: null,
          action: 'GDPR_ERASURE',
          targetType: 'PastoralNote',
          targetId: n.id,
          metadata: { reason: 'soft_delete_retention_purge' },
        });
      }

      const members = await this.prisma.member.findMany({
        where: { deletedAt: { lte: cutoff } },
        select: { id: true, churchId: true },
        take: 100,
      });
      for (const m of members) {
        await this.prisma.followUp.updateMany({
          where: { churchId: m.churchId, memberId: m.id },
          data: { memberId: null },
        });
        await this.prisma.member.delete({ where: { id: m.id } });
        await this.audit.append({
          churchId: m.churchId,
          actorId: null,
          action: 'GDPR_ERASURE',
          targetType: 'Member',
          targetId: m.id,
          metadata: { reason: 'soft_delete_retention_purge' },
        });
      }

      if (notes.length || members.length) {
        this.logger.log(
          `Purged soft-deleted rows older than ${days}d: notes=${notes.length} members=${members.length}`,
        );
      }
      return { notes: notes.length, members: members.length };
    });
  }
}
