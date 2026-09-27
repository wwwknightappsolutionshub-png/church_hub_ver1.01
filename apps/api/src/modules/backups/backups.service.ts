import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BackupArtifactType,
  BackupFrequency,
  BackupJobStatus,
  BackupRequestStatus,
  BackupScope,
  BackupTrigger,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import {
  BACKUP_DOWNLOAD_TTL_MS,
  BACKUPS_QUEUE,
  BackupQueueJob,
  TENANT_BACKUP_REQUEST_MAX_PER_DAY,
} from './backups.constants';
import { BackupStorageService } from './backup-storage.service';
import { FullDbBackupService } from './full-db-backup.service';
import { TenantExportService } from './tenant-export.service';
import { computeNextRunAt } from './backup-schedule.util';

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: BackupStorageService,
    private readonly fullDb: FullDbBackupService,
    private readonly tenantExport: TenantExportService,
    private readonly email: EmailAdapter,
    @Optional() @InjectQueue(BACKUPS_QUEUE) private readonly queue?: Queue<BackupQueueJob>,
  ) {}

  // ─── Status monitor ─────────────────────────────────────────

  async getStatusMonitor() {
    const [lastFull, lastTenant, recentJobs, pendingRequests, schedules] = await Promise.all([
      this.prisma.backupJob.findFirst({
        where: { scope: BackupScope.FULL_DB },
        orderBy: { createdAt: 'desc' },
        include: { artifacts: true },
      }),
      this.prisma.backupJob.findFirst({
        where: { scope: BackupScope.TENANT },
        orderBy: { createdAt: 'desc' },
        include: { church: { select: { id: true, name: true, slug: true } }, artifacts: true },
      }),
      this.prisma.backupJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 40,
        include: {
          church: { select: { id: true, name: true, slug: true } },
          artifacts: { select: { id: true, type: true, fileName: true, byteSize: true } },
        },
      }),
      this.prisma.backupRequest.count({ where: { status: BackupRequestStatus.PENDING } }),
      this.prisma.backupSchedule.findMany({
        include: { church: { select: { id: true, name: true, slug: true } } },
        orderBy: [{ churchId: 'asc' }, { scope: 'asc' }],
      }),
    ]);

    return {
      fullDb: this.summarizeJob(lastFull),
      lastTenant: this.summarizeJob(lastTenant),
      pendingRequests,
      schedules: schedules.map((s) => this.serializeSchedule(s)),
      recentJobs: recentJobs.map((j) => this.serializeJob(j)),
    };
  }

  async listJobs(params?: { scope?: BackupScope; churchId?: string; take?: number }) {
    const jobs = await this.prisma.backupJob.findMany({
      where: {
        scope: params?.scope,
        churchId: params?.churchId,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(params?.take ?? 50, 100),
      include: {
        church: { select: { id: true, name: true, slug: true } },
        artifacts: true,
        triggeredBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    return jobs.map((j) => this.serializeJob(j));
  }

  // ─── Manual / enqueue ───────────────────────────────────────

  async enqueueFullDb(actorUserId: string | null, trigger: BackupTrigger = BackupTrigger.MANUAL_ADMIN) {
    const job = await this.prisma.backupJob.create({
      data: {
        scope: BackupScope.FULL_DB,
        trigger,
        status: BackupJobStatus.QUEUED,
        triggeredById: actorUserId,
      },
    });
    await this.dispatch(job.id);
    return this.getJob(job.id);
  }

  async enqueueTenant(
    actorUserId: string | null,
    churchId: string,
    trigger: BackupTrigger = BackupTrigger.MANUAL_ADMIN,
    requestId?: string,
  ) {
    const church = await this.prisma.church.findUnique({ where: { id: churchId }, select: { id: true } });
    if (!church) throw new NotFoundException('Church not found');

    const job = await this.prisma.backupJob.create({
      data: {
        scope: BackupScope.TENANT,
        churchId,
        trigger,
        status: BackupJobStatus.QUEUED,
        triggeredById: actorUserId,
        requestId: requestId ?? null,
      },
    });
    await this.dispatch(job.id);
    return this.getJob(job.id);
  }

  private async dispatch(jobId: string) {
    if (this.queue) {
      await this.queue.add('run', { jobId }, { removeOnComplete: 100, removeOnFail: 200 });
      return;
    }
    // Inline fallback when Redis is disabled (dev / constrained hosts)
    setImmediate(() => {
      void this.processJob(jobId).catch((err) =>
        this.logger.error(`Inline backup job ${jobId} failed: ${err instanceof Error ? err.message : err}`),
      );
    });
  }

  async processJob(jobId: string) {
    if (this.running.has(jobId)) return;
    this.running.add(jobId);
    try {
      const job = await this.prisma.backupJob.findUnique({ where: { id: jobId } });
      if (!job) return;
      if (job.status !== BackupJobStatus.QUEUED && job.status !== BackupJobStatus.RUNNING) return;

      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: { status: BackupJobStatus.RUNNING, startedAt: new Date(), errorSummary: null },
      });

      if (job.scope === BackupScope.FULL_DB) {
        const result = await this.fullDb.run(jobId);
        await this.prisma.backupArtifact.create({
          data: {
            jobId,
            type: BackupArtifactType.SQL_GZ,
            storageKey: result.storageKey,
            fileName: result.fileName,
            mimeType: 'application/gzip',
            byteSize: BigInt(result.byteSize),
            checksumSha256: result.checksumSha256,
            expiresAt: this.defaultExpiry(30),
          },
        });
        await this.prisma.backupJob.update({
          where: { id: jobId },
          data: {
            status: BackupJobStatus.SUCCESS,
            finishedAt: new Date(),
            bytesTotal: BigInt(result.byteSize),
            checksumSha256: result.checksumSha256,
          },
        });
      } else {
        if (!job.churchId) throw new Error('TENANT job missing churchId');
        const result = await this.tenantExport.run(jobId, job.churchId);
        await this.prisma.backupArtifact.create({
          data: {
            jobId,
            type: BackupArtifactType.TENANT_JSON_GZ,
            storageKey: result.storageKey,
            fileName: result.fileName,
            mimeType: 'application/gzip',
            byteSize: BigInt(result.byteSize),
            checksumSha256: result.checksumSha256,
            expiresAt: this.defaultExpiry(14),
          },
        });
        await this.prisma.backupJob.update({
          where: { id: jobId },
          data: {
            status: result.partial ? BackupJobStatus.PARTIAL : BackupJobStatus.SUCCESS,
            finishedAt: new Date(),
            bytesTotal: BigInt(result.byteSize),
            checksumSha256: result.checksumSha256,
            tablesExported: result.tablesExported,
            mediaFilesOk: result.mediaFilesOk,
            mediaFilesFail: result.mediaFilesFail,
            warningSummary: result.warnings.length ? result.warnings.slice(0, 20).join('\n') : null,
          },
        });
      }

      await this.touchScheduleAfterRun(job.scope, job.churchId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Backup job ${jobId} failed: ${message}`);
      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: {
          status: BackupJobStatus.FAILED,
          finishedAt: new Date(),
          errorSummary: message.slice(0, 4000),
        },
      });
    } finally {
      this.running.delete(jobId);
    }
  }

  async getJob(jobId: string) {
    const job = await this.prisma.backupJob.findUnique({
      where: { id: jobId },
      include: {
        church: { select: { id: true, name: true, slug: true } },
        artifacts: true,
        triggeredBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        request: true,
      },
    });
    if (!job) throw new NotFoundException('Backup job not found');
    return this.serializeJob(job);
  }

  // ─── Download ───────────────────────────────────────────────

  async prepareDownload(params: {
    artifactId: string;
    actor: { userId: string; isPlatform: boolean; churchId?: string | null };
  }) {
    const artifact = await this.prisma.backupArtifact.findUnique({
      where: { id: params.artifactId },
      include: { job: true },
    });
    if (!artifact) throw new NotFoundException('Artifact not found');
    if (artifact.expiresAt && artifact.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Artifact has expired');
    }

    const job = artifact.job;
    if (params.actor.isPlatform) {
      // platform download permission checked at controller
    } else {
      if (job.scope !== BackupScope.TENANT || job.churchId !== params.actor.churchId) {
        throw new ForbiddenException('Not allowed to download this artifact');
      }
      if (job.trigger !== BackupTrigger.TENANT_REQUEST || !job.requestId) {
        throw new ForbiddenException('Only approved backup requests can be downloaded by the church');
      }
      const req = await this.prisma.backupRequest.findUnique({ where: { id: job.requestId } });
      if (!req || req.status !== BackupRequestStatus.APPROVED) {
        throw new ForbiddenException('Backup request is not approved');
      }
      if (job.status !== BackupJobStatus.SUCCESS && job.status !== BackupJobStatus.PARTIAL) {
        throw new BadRequestException('Backup is not ready for download');
      }
    }

    if (!(await this.storage.fileExists(artifact.storageKey))) {
      throw new NotFoundException('Artifact file missing from storage');
    }

    const expiresAt = new Date(Date.now() + BACKUP_DOWNLOAD_TTL_MS);
    const token = this.storage.issueDownloadToken(artifact.id, expiresAt);
    await this.prisma.backupArtifact.update({
      where: { id: artifact.id },
      data: { downloadTokenHash: this.storage.hashToken(token) },
    });

    return {
      artifactId: artifact.id,
      fileName: this.clientDownloadName(artifact.fileName),
      mimeType: artifact.mimeType,
      byteSize: Number(artifact.byteSize),
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Validate HMAC + stored hash, then atomically clear the hash (single-use).
   * Concurrent redeem attempts with the same token: only one succeeds.
   */
  async redeemDownloadToken(artifactId: string, token: string) {
    if (!token?.trim()) {
      throw new ForbiddenException('Download token required');
    }
    const artifact = await this.prisma.backupArtifact.findUnique({
      where: { id: artifactId },
      select: { id: true, downloadTokenHash: true },
    });
    if (!artifact) throw new NotFoundException('Artifact not found');
    if (!artifact.downloadTokenHash) {
      throw new ForbiddenException('Download token not issued or already used');
    }
    if (!this.storage.verifyDownloadToken(token, artifactId)) {
      throw new ForbiddenException('Invalid or expired download token');
    }
    const hash = this.storage.hashToken(token);
    if (!this.storage.safeEqualHash(hash, artifact.downloadTokenHash)) {
      throw new ForbiddenException('Download token mismatch');
    }
    const consumed = await this.prisma.backupArtifact.updateMany({
      where: { id: artifactId, downloadTokenHash: hash },
      data: { downloadTokenHash: null },
    });
    if (consumed.count !== 1) {
      throw new ForbiddenException('Download token already used');
    }
  }

  /** Decrypted plaintext stream for authorized downloads. */
  openArtifactStream(storageKey: string) {
    return this.storage.openDecryptedReadStream(storageKey);
  }

  clientDownloadName(storedFileName: string) {
    return this.storage.clientDownloadName(storedFileName);
  }

  async assertTenantArtifactAccess(params: {
    artifactId: string;
    churchId: string;
  }) {
    const artifact = await this.prisma.backupArtifact.findUnique({
      where: { id: params.artifactId },
      include: { job: true },
    });
    if (!artifact) throw new NotFoundException('Artifact not found');
    const job = artifact.job;
    if (job.scope !== BackupScope.TENANT || job.churchId !== params.churchId) {
      throw new ForbiddenException('Not allowed to download this artifact');
    }
    if (job.trigger !== BackupTrigger.TENANT_REQUEST || !job.requestId) {
      throw new ForbiddenException('Only approved backup requests can be downloaded by the church');
    }
    const req = await this.prisma.backupRequest.findUnique({ where: { id: job.requestId } });
    if (!req || req.status !== BackupRequestStatus.APPROVED) {
      throw new ForbiddenException('Backup request is not approved');
    }
    if (job.status !== BackupJobStatus.SUCCESS && job.status !== BackupJobStatus.PARTIAL) {
      throw new BadRequestException('Backup is not ready for download');
    }
    return artifact;
  }

  async getArtifactForStream(artifactId: string) {
    const artifact = await this.prisma.backupArtifact.findUnique({
      where: { id: artifactId },
      include: { job: true },
    });
    if (!artifact) throw new NotFoundException('Artifact not found');
    return artifact;
  }

  // ─── Tenant requests (P3) ───────────────────────────────────

  async createTenantRequest(params: {
    churchId: string;
    userId: string;
    reason?: string;
  }) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.backupRequest.findMany({
      where: { churchId: params.churchId, createdAt: { gte: since } },
      select: { id: true, status: true },
    });
    if (recent.some((r) => r.status === BackupRequestStatus.PENDING)) {
      throw new BadRequestException('A backup request is already pending review');
    }
    if (recent.length >= TENANT_BACKUP_REQUEST_MAX_PER_DAY) {
      throw new BadRequestException(
        `Maximum of ${TENANT_BACKUP_REQUEST_MAX_PER_DAY} backup requests per 24 hours`,
      );
    }

    const request = await this.prisma.backupRequest.create({
      data: {
        churchId: params.churchId,
        requestedById: params.userId,
        reason: params.reason?.trim().slice(0, 2000) || null,
        status: BackupRequestStatus.PENDING,
      },
      include: {
        church: { select: { id: true, name: true, slug: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.notifyPlatformAdminsOfRequest({
      id: request.id,
      churchId: request.churchId,
      church: request.church,
      requestedBy: request.requestedBy,
      reason: request.reason,
    });
    return this.serializeRequest(request);
  }

  async listRequests(status?: BackupRequestStatus) {
    const rows = await this.prisma.backupRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        church: { select: { id: true, name: true, slug: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: { include: { artifacts: true } },
      },
    });
    return rows.map((r) => this.serializeRequest(r));
  }

  async listTenantRequests(churchId: string) {
    const rows = await this.prisma.backupRequest.findMany({
      where: { churchId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        job: { include: { artifacts: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return rows.map((r) => this.serializeRequest(r));
  }

  async reviewRequest(params: {
    requestId: string;
    reviewerId: string;
    approve: boolean;
    reviewNote?: string;
  }) {
    const request = await this.prisma.backupRequest.findUnique({
      where: { id: params.requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== BackupRequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    if (!params.approve) {
      const updated = await this.prisma.backupRequest.update({
        where: { id: request.id },
        data: {
          status: BackupRequestStatus.REJECTED,
          reviewedById: params.reviewerId,
          reviewedAt: new Date(),
          reviewNote: params.reviewNote?.trim().slice(0, 2000) || null,
        },
        include: {
          church: { select: { id: true, name: true, slug: true } },
          requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          job: true,
        },
      });
      return this.serializeRequest(updated);
    }

    const updated = await this.prisma.backupRequest.update({
      where: { id: request.id },
      data: {
        status: BackupRequestStatus.APPROVED,
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
        reviewNote: params.reviewNote?.trim().slice(0, 2000) || null,
      },
    });

    const job = await this.enqueueTenant(
      params.reviewerId,
      updated.churchId,
      BackupTrigger.TENANT_REQUEST,
      updated.id,
    );

    return { request: await this.getRequest(updated.id), job };
  }

  async getRequest(id: string) {
    const request = await this.prisma.backupRequest.findUnique({
      where: { id },
      include: {
        church: { select: { id: true, name: true, slug: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: { include: { artifacts: true } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    return this.serializeRequest(request);
  }

  private async notifyPlatformAdminsOfRequest(request: {
    id: string;
    churchId: string;
    church: { id: string; name: string; slug: string };
    requestedBy: { firstName: string; lastName: string; email: string };
    reason: string | null;
  }) {
    const admins = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { name: 'PLATFORM_ADMIN' } } },
      },
      select: { id: true, email: true, firstName: true },
    });

    const title = `Backup request: ${request.church.name}`;
    const body = `${request.requestedBy.firstName} ${request.requestedBy.lastName} requested a tenant data backup for ${request.church.name} (${request.church.slug}).${
      request.reason ? ` Reason: ${request.reason}` : ''
    }`;

    if (admins.length) {
      await this.prisma.notification.createMany({
        data: admins.map((a) => ({
          id: randomUUID(),
          churchId: request.churchId,
          userId: a.id,
          title,
          body,
          type: 'BACKUP_REQUEST',
          data: { requestId: request.id, source: 'backups' } as Prisma.InputJsonValue,
        })),
      });
    }

    for (const admin of admins) {
      if (!admin.email) continue;
      void this.email
        .send({
          to: admin.email,
          subject: `[Church Hub] ${title}`,
          body: `${body}\n\nReview in Platform → Backups.`,
          html: `<p>${escapeHtml(body)}</p><p>Review in <strong>Platform → Backups</strong>.</p>`,
          churchId: null,
          purpose: 'connect',
        })
        .catch((err) =>
          this.logger.warn(`Backup request email failed: ${err instanceof Error ? err.message : err}`),
        );
    }
  }

  // ─── Schedules (P4) ─────────────────────────────────────────

  async listSchedules() {
    const rows = await this.prisma.backupSchedule.findMany({
      include: { church: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ churchId: 'asc' }, { scope: 'asc' }],
    });
    return rows.map((s) => this.serializeSchedule(s));
  }

  async upsertSchedule(params: {
    actorUserId: string;
    churchId?: string | null;
    scope: BackupScope;
    enabled?: boolean;
    frequency?: BackupFrequency;
    hourUtc?: number;
    minuteUtc?: number;
    dayOfPeriod?: number | null;
    timezone?: string;
    retentionDays?: number;
  }) {
    if (params.scope === BackupScope.FULL_DB && params.churchId) {
      throw new BadRequestException('Full database schedule must be global (no churchId)');
    }
    if (params.scope === BackupScope.TENANT && !params.churchId) {
      throw new BadRequestException('Tenant schedule requires churchId');
    }

    const frequency = params.frequency ?? BackupFrequency.DAILY;
    const hourUtc = params.hourUtc ?? 2;
    const minuteUtc = params.minuteUtc ?? 0;
    const dayOfPeriod = params.dayOfPeriod ?? null;
    const nextRunAt = computeNextRunAt({ frequency, hourUtc, minuteUtc, dayOfPeriod });

    const existing = await this.prisma.backupSchedule.findFirst({
      where: {
        scope: params.scope,
        churchId: params.churchId ?? null,
      },
    });

    const data = {
      enabled: params.enabled ?? true,
      frequency,
      hourUtc,
      minuteUtc,
      dayOfPeriod,
      timezone: params.timezone?.trim() || 'UTC',
      retentionDays: params.retentionDays ?? 30,
      nextRunAt,
      updatedById: params.actorUserId,
    };

    const row = existing
      ? await this.prisma.backupSchedule.update({ where: { id: existing.id }, data })
      : await this.prisma.backupSchedule.create({
          data: {
            churchId: params.churchId ?? null,
            scope: params.scope,
            ...data,
          },
        });

    return this.serializeSchedule(
      await this.prisma.backupSchedule.findUniqueOrThrow({
        where: { id: row.id },
        include: { church: { select: { id: true, name: true, slug: true } } },
      }),
    );
  }

  async processDueSchedules() {
    const due = await this.prisma.backupSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: new Date() },
      },
      take: 20,
    });

    for (const schedule of due) {
      try {
        if (schedule.scope === BackupScope.FULL_DB) {
          await this.enqueueFullDb(schedule.updatedById, BackupTrigger.SCHEDULED);
        } else if (schedule.churchId) {
          await this.enqueueTenant(
            schedule.updatedById,
            schedule.churchId,
            BackupTrigger.SCHEDULED,
          );
        }
        const nextRunAt = computeNextRunAt({
          frequency: schedule.frequency,
          hourUtc: schedule.hourUtc,
          minuteUtc: schedule.minuteUtc,
          dayOfPeriod: schedule.dayOfPeriod,
          from: new Date(),
        });
        await this.prisma.backupSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: new Date(), nextRunAt },
        });
      } catch (err) {
        this.logger.warn(
          `Schedule ${schedule.id} tick failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  private async touchScheduleAfterRun(scope: BackupScope, churchId: string | null) {
    const schedule = await this.prisma.backupSchedule.findFirst({
      where: { scope, churchId: churchId ?? null },
    });
    if (!schedule) return;
    await this.prisma.backupSchedule.update({
      where: { id: schedule.id },
      data: { lastRunAt: new Date() },
    });
  }

  private defaultExpiry(days: number) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private summarizeJob(job: Awaited<ReturnType<typeof this.prisma.backupJob.findFirst>> | null) {
    if (!job) {
      return { status: 'NEVER', lastAt: null as string | null, job: null };
    }
    return {
      status: job.status,
      lastAt: (job.finishedAt ?? job.createdAt).toISOString(),
      job: this.serializeJob(job),
    };
  }

  private serializeJob(job: any) {
    return {
      id: job.id,
      scope: job.scope,
      churchId: job.churchId,
      church: job.church ?? null,
      trigger: job.trigger,
      status: job.status,
      triggeredBy: job.triggeredBy ?? null,
      requestId: job.requestId,
      startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null,
      bytesTotal: job.bytesTotal != null ? Number(job.bytesTotal) : 0,
      checksumSha256: job.checksumSha256,
      errorSummary: job.errorSummary,
      warningSummary: job.warningSummary,
      tablesExported: job.tablesExported,
      mediaFilesOk: job.mediaFilesOk,
      mediaFilesFail: job.mediaFilesFail,
      createdAt: job.createdAt.toISOString(),
      artifacts: (job.artifacts ?? []).map((a: any) => ({
        id: a.id,
        type: a.type,
        fileName: a.fileName,
        mimeType: a.mimeType,
        byteSize: Number(a.byteSize),
        checksumSha256: a.checksumSha256,
        expiresAt: a.expiresAt?.toISOString() ?? null,
      })),
    };
  }

  private serializeRequest(r: any) {
    return {
      id: r.id,
      churchId: r.churchId,
      church: r.church ?? null,
      reason: r.reason,
      status: r.status,
      requestedBy: r.requestedBy ?? null,
      reviewedBy: r.reviewedBy ?? null,
      reviewNote: r.reviewNote,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      job: r.job ? this.serializeJob(r.job) : null,
    };
  }

  private serializeSchedule(s: any) {
    return {
      id: s.id,
      churchId: s.churchId,
      church: s.church ?? null,
      scope: s.scope,
      enabled: s.enabled,
      frequency: s.frequency,
      hourUtc: s.hourUtc,
      minuteUtc: s.minuteUtc,
      dayOfPeriod: s.dayOfPeriod,
      timezone: s.timezone,
      retentionDays: s.retentionDays,
      nextRunAt: s.nextRunAt?.toISOString() ?? null,
      lastRunAt: s.lastRunAt?.toISOString() ?? null,
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
