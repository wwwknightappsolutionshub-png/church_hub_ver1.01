import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FollowUpStage,
  MemberRoleType,
  MemberStatus,
  MembershipImportJobStatus,
  MembershipImportMode,
  MembershipImportRowAction,
  Prisma,
} from '@prisma/client';
import {
  MembershipImportColumnMappingSchema,
  MembershipImportOptionsSchema,
  type MembershipImportColumnMapping,
  type MembershipImportMappedRow,
  type MembershipImportOptions,
  suggestColumnMapping,
} from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import { parseCsvText } from './membership-import-csv.util';
import { MembershipService } from './membership.service';
import { MembershipActivityService } from './membership-activity.service';
import { MembershipAttendanceService } from './membership-attendance.service';
import { MembershipClassesService } from './membership-classes.service';
import { FollowUpService } from '../follow-up/follow-up.service';

const BATCH_SIZE = 100;

type RowCounts = {
  total: number;
  create: number;
  update: number;
  skip: number;
  error: number;
};

@Injectable()
export class MembershipImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly activity: MembershipActivityService,
    private readonly attendance: MembershipAttendanceService,
    private readonly classes: MembershipClassesService,
    private readonly followUp: FollowUpService,
  ) {}

  getTemplateCsv(): string {
    return (
      'First Name,Last Name,Email,Phone,Status,Roles,Address,City,Date of Birth,Notes,Household Name,Head of Household,Attendance Date,Attendance Present,Service Name,Class Code\n'
    );
  }

  async upload(
    churchId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('CSV file is required');
    const text = file.buffer.toString('utf8');
    const { headers, rows } = parseCsvText(text);
    if (!headers.length) throw new BadRequestException('CSV has no header row');
    if (!rows.length) throw new BadRequestException('CSV has no data rows');

    const job = await this.prisma.membershipImportJob.create({
      data: {
        churchId,
        uploadedByUserId: userId,
        status: 'UPLOADED',
        sourceFilename: file.originalname ?? 'import.csv',
        columnMapping: suggestColumnMapping(headers) as Prisma.InputJsonValue,
        rowCounts: { total: rows.length, create: 0, update: 0, skip: 0, error: 0 },
      },
    });

    await this.prisma.membershipImportJobRow.createMany({
      data: rows.map((raw, rowIndex) => ({
        jobId: job.id,
        rowIndex,
        raw: raw as Prisma.InputJsonValue,
      })),
    });

    return {
      jobId: job.id,
      status: job.status,
      headers,
      suggestedMapping: suggestColumnMapping(headers),
      rowCount: rows.length,
    };
  }

  async preview(
    churchId: string,
    jobId: string,
    body: { columnMapping: MembershipImportColumnMapping; options?: MembershipImportOptions },
  ) {
    const mapping = MembershipImportColumnMappingSchema.parse(body.columnMapping);
    if (!mapping.firstName?.trim() || !mapping.lastName?.trim()) {
      throw new BadRequestException('Column mapping must include first name and last name');
    }
    const options = MembershipImportOptionsSchema.parse(body.options ?? {});

    const job = await this.getJobOrThrow(churchId, jobId);
    if (job.status === 'COMMITTED') {
      throw new BadRequestException('Import job already committed');
    }

    const rows = await this.prisma.membershipImportJobRow.findMany({
      where: { jobId },
      orderBy: { rowIndex: 'asc' },
    });

    const existingIndex = await this.buildExistingMemberIndex(churchId);
    const seenInFile = new Set<string>();
    const counts: RowCounts = { total: rows.length, create: 0, update: 0, skip: 0, error: 0 };
    const previewRows: Array<{
      rowIndex: number;
      action: MembershipImportRowAction | null;
      error: string | null;
      mapped: Partial<MembershipImportMappedRow>;
      raw: Record<string, string>;
      existingMemberId?: string | null;
    }> = [];

    for (const row of rows) {
      const raw = row.raw as Record<string, string>;
      const { mapped, error: mapError } = this.mapRow(raw, mapping);
      let action: MembershipImportRowAction | null = null;
      let error: string | null = mapError;
      let existingMemberId: string | null = null;

      if (!error && mapped.firstName && mapped.lastName) {
        const dedupeKey = this.dedupeKey(mapped.email, mapped.phone);
        if (options.skipDuplicatesInFile && dedupeKey && seenInFile.has(dedupeKey)) {
          action = 'SKIP';
          error = 'Duplicate row in file (same email or phone)';
        } else {
          if (dedupeKey) seenInFile.add(dedupeKey);
          const match = this.findExisting(existingIndex, mapped.email, mapped.phone);
          if (match) {
            existingMemberId = match.id;
            action = options.updateExisting ? 'UPDATE' : 'SKIP';
            if (!options.updateExisting) error = 'Already exists in church (update disabled)';
          } else {
            action = 'CREATE';
          }
        }
      } else if (!error) {
        action = 'ERROR';
        error = 'First name and last name are required';
      } else {
        action = 'ERROR';
      }

      if (action === 'CREATE') counts.create++;
      else if (action === 'UPDATE') counts.update++;
      else if (action === 'SKIP') counts.skip++;
      else if (action === 'ERROR') counts.error++;

      previewRows.push({
        rowIndex: row.rowIndex,
        action,
        error,
        mapped,
        raw,
        existingMemberId,
      });

      await this.prisma.membershipImportJobRow.update({
        where: { id: row.id },
        data: {
          mapped: mapped as Prisma.InputJsonValue,
          action,
          error,
          memberId: existingMemberId,
        },
      });
    }

    await this.prisma.membershipImportJob.update({
      where: { id: jobId },
      data: {
        status: 'PREVIEWED',
        mode: options.mode as MembershipImportMode,
        columnMapping: mapping as Prisma.InputJsonValue,
        options: options as Prisma.InputJsonValue,
        rowCounts: counts as Prisma.InputJsonValue,
      },
    });

    return {
      jobId,
      status: 'PREVIEWED' as MembershipImportJobStatus,
      headers: Object.keys((rows[0]?.raw as Record<string, string>) ?? {}),
      suggestedMapping: mapping,
      rows: previewRows,
      rowCounts: counts,
    };
  }

  async commit(churchId: string, jobId: string, actorUserId: string) {
    const job = await this.getJobOrThrow(churchId, jobId);
    if (job.status !== 'PREVIEWED') {
      throw new BadRequestException('Run preview before commit');
    }
    const options = MembershipImportOptionsSchema.parse(job.options ?? {});
    const mapping = MembershipImportColumnMappingSchema.parse(job.columnMapping ?? {});

    const rows = await this.prisma.membershipImportJobRow.findMany({
      where: { jobId, action: { in: ['CREATE', 'UPDATE'] } },
      orderBy: { rowIndex: 'asc' },
    });

    const summary = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      familiesCreated: 0,
      attendanceRecorded: 0,
      classesEnrolled: 0,
      followUpsCreated: 0,
    };

    const familyCache = new Map<string, string>();
    const existingFamilies = await this.prisma.family.findMany({
      where: { churchId },
      select: { id: true, name: true },
    });
    for (const f of existingFamilies) {
      familyCache.set(f.name.trim().toLowerCase(), f.id);
    }

    const servicesByName = new Map<string, string>();
    const churchServices = await this.prisma.churchService.findMany({
      where: { churchId, isActive: true },
    });
    for (const s of churchServices) {
      servicesByName.set(s.name.trim().toLowerCase(), s.id);
    }

    const classesByCode = new Map<string, string>();
    const classDefs = await this.prisma.membershipClassDefinition.findMany({
      where: { churchId, isActive: true },
    });
    for (const c of classDefs) {
      classesByCode.set(c.code.trim().toLowerCase(), c.id);
    }

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await this.prisma.$transaction(async (tx) => {
        for (const row of batch) {
          try {
            const raw = row.raw as Record<string, string>;
            const { mapped, error: mapError } = this.mapRow(raw, mapping);
            if (mapError || !mapped.firstName || !mapped.lastName) {
              summary.failed++;
              await tx.membershipImportJobRow.update({
                where: { id: row.id },
                data: { action: 'ERROR', error: mapError ?? 'Invalid row' },
              });
              continue;
            }

            if (options.mode === 'LEADS') {
              const stage = this.parseFollowUpStage(mapped.followUpStage) ?? 'NEW_LEAD';
              const fu = await this.followUp.create(churchId, {
                contactName: `${mapped.firstName} ${mapped.lastName}`.trim(),
                contactPhone: mapped.phone,
                contactEmail: mapped.email,
                stage,
                notes: mapped.notes,
                scheduleReminder: false,
              });
              summary.followUpsCreated++;
              await tx.membershipImportJobRow.update({
                where: { id: row.id },
                data: { action: 'CREATE', error: null },
              });
              void fu;
              continue;
            }

            let familyId: string | undefined;
            if (mapped.familyName?.trim()) {
              const key = mapped.familyName.trim().toLowerCase();
              let fid = familyCache.get(key);
              if (!fid) {
                const created = await tx.family.create({
                  data: { churchId, name: mapped.familyName.trim() },
                });
                fid = created.id;
                familyCache.set(key, fid);
                summary.familiesCreated++;
              }
              familyId = fid;
            }

            let memberId = row.memberId ?? undefined;
            if (row.action === 'UPDATE') {
              if (!memberId) {
                const match = await this.findExisting(
                  await this.buildExistingMemberIndex(churchId),
                  mapped.email,
                  mapped.phone,
                );
                memberId = match?.id;
              }
              if (!memberId) {
                summary.failed++;
                continue;
              }
              await this.membership.updateMember(
                churchId,
                memberId,
                {
                  firstName: mapped.firstName,
                  lastName: mapped.lastName,
                  email: mapped.email,
                  phone: mapped.phone,
                  status: mapped.status,
                  roles: mapped.roles,
                  address: mapped.address,
                  city: mapped.city,
                  dateOfBirth: mapped.dateOfBirth,
                  notes: mapped.notes,
                  familyId: familyId ?? null,
                },
                actorUserId,
              );
              if (mapped.headOfHousehold && familyId) {
                await tx.family.update({
                  where: { id: familyId },
                  data: { headMemberId: memberId },
                });
              }
              summary.updated++;
            } else {
              const created = await this.membership.createMember(churchId, {
                firstName: mapped.firstName,
                lastName: mapped.lastName,
                email: mapped.email,
                phone: mapped.phone,
                status: mapped.status ?? 'VISITOR',
                roles: mapped.roles ?? ['ADULT'],
                address: mapped.address,
                city: mapped.city,
                dateOfBirth: mapped.dateOfBirth,
                notes: mapped.notes,
                bornAgain: mapped.bornAgain,
                baptizedInHolySpirit: mapped.baptizedInHolySpirit,
                familyId,
                startOnboarding: false,
              });
              memberId = created.id;
              await this.activity.log(
                churchId,
                memberId,
                'MEMBER_IMPORTED',
                `Imported from ${job.sourceFilename ?? 'CSV'}`,
                { actorUserId, metadata: { jobId } },
              );
              if (mapped.headOfHousehold && familyId) {
                await tx.family.update({
                  where: { id: familyId },
                  data: { headMemberId: memberId },
                });
              }
              summary.created++;
            }

            if (memberId && mapped.attendanceDate) {
              const serviceId = mapped.churchServiceName
                ? servicesByName.get(mapped.churchServiceName.trim().toLowerCase())
                : churchServices[0]?.id;
              if (serviceId) {
                try {
                  await this.attendance.recordOne(
                    churchId,
                    {
                      memberId,
                      scope: 'SERVICE',
                      serviceDate: mapped.attendanceDate,
                      present: mapped.attendancePresent !== false,
                      churchServiceId: serviceId,
                    },
                    actorUserId,
                  );
                  summary.attendanceRecorded++;
                } catch {
                  /* non-fatal */
                }
              }
            }

            if (memberId && mapped.classCode) {
              const classDefId = classesByCode.get(mapped.classCode.trim().toLowerCase());
              if (classDefId) {
                try {
                  await this.classes.enroll(
                    churchId,
                    { memberId, classDefinitionId: classDefId },
                    actorUserId,
                  );
                  summary.classesEnrolled++;
                } catch {
                  /* already enrolled */
                }
              }
            }

            await tx.membershipImportJobRow.update({
              where: { id: row.id },
              data: {
                memberId,
                familyId: familyId ?? null,
                action: row.action,
                error: null,
              },
            });
          } catch (e) {
            summary.failed++;
            const msg = e instanceof Error ? e.message : 'Commit failed';
            await tx.membershipImportJobRow.update({
              where: { id: row.id },
              data: { action: 'ERROR', error: msg },
            });
          }
        }
      });
    }

    const skipped = await this.prisma.membershipImportJobRow.count({
      where: { jobId, action: 'SKIP' },
    });
    summary.skipped = skipped;

    await this.prisma.membershipImportJob.update({
      where: { id: jobId },
      data: {
        status: 'COMMITTED',
        committedAt: new Date(),
        summary: summary as Prisma.InputJsonValue,
        rowCounts: {
          total: rows.length + skipped + summary.failed,
          create: summary.created,
          update: summary.updated,
          skip: summary.skipped,
          error: summary.failed,
        } as Prisma.InputJsonValue,
      },
    });

    return { jobId, status: 'COMMITTED' as MembershipImportJobStatus, summary };
  }

  async getJob(churchId: string, jobId: string) {
    const job = await this.getJobOrThrow(churchId, jobId);
    const rows = await this.prisma.membershipImportJobRow.findMany({
      where: { jobId },
      orderBy: { rowIndex: 'asc' },
      take: 500,
    });
    return { job, rows };
  }

  private async getJobOrThrow(churchId: string, jobId: string) {
    const job = await this.prisma.membershipImportJob.findFirst({
      where: { id: jobId, churchId },
    });
    if (!job) throw new NotFoundException('Import job not found');
    return job;
  }

  private mapRow(raw: Record<string, string>, mapping: MembershipImportColumnMapping) {
    const pick = (field: keyof MembershipImportColumnMapping) => {
      const header = mapping[field];
      if (!header) return undefined;
      const v = raw[header]?.trim();
      return v || undefined;
    };

    try {
      const firstName = pick('firstName');
      const lastName = pick('lastName');
      const mapped: MembershipImportMappedRow = {
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        email: pick('email'),
        phone: pick('phone'),
        status: this.parseStatus(pick('status')),
        roles: this.parseRoles(pick('roles')),
        address: pick('address'),
        city: pick('city'),
        dateOfBirth: pick('dateOfBirth'),
        notes: pick('notes'),
        bornAgain: this.parseBool(pick('bornAgain')),
        baptizedInHolySpirit: this.parseBool(pick('baptizedInHolySpirit')),
        familyName: pick('familyName'),
        headOfHousehold: this.parseBool(pick('headOfHousehold')),
        attendanceDate: pick('attendanceDate'),
        attendancePresent: this.parseBool(pick('attendancePresent')),
        churchServiceName: pick('churchServiceName'),
        classCode: pick('classCode'),
        followUpStage: pick('followUpStage'),
      };
      return { mapped, error: null as string | null };
    } catch (e) {
      return {
        mapped: {} as MembershipImportMappedRow,
        error: e instanceof Error ? e.message : 'Invalid row',
      };
    }
  }

  private async buildExistingMemberIndex(churchId: string) {
    const members = await this.prisma.member.findMany({
      where: { churchId },
      select: { id: true, email: true, phone: true },
    });
    return members;
  }

  private findExisting(
    members: Array<{ id: string; email: string | null; phone: string | null }>,
    email?: string,
    phone?: string,
  ) {
    const ne = email ? this.normalizeEmail(email) : null;
    const np = phone ? this.normalizePhone(phone) : null;
    return members.find((m) => {
      if (ne && m.email && this.normalizeEmail(m.email) === ne) return true;
      if (np && m.phone && this.normalizePhone(m.phone) === np) return true;
      return false;
    });
  }

  private dedupeKey(email?: string, phone?: string) {
    const ne = email ? this.normalizeEmail(email) : '';
    const np = phone ? this.normalizePhone(phone) : '';
    if (!ne && !np) return null;
    return `${ne}|${np}`;
  }

  private normalizeEmail(v: string) {
    return v.trim().toLowerCase();
  }

  private normalizePhone(v: string) {
    return v.replace(/\D/g, '');
  }

  private parseBool(v?: string): boolean | undefined {
    if (v === undefined) return undefined;
    const s = v.trim().toLowerCase();
    if (['yes', 'y', 'true', '1', 'present'].includes(s)) return true;
    if (['no', 'n', 'false', '0', 'absent'].includes(s)) return false;
    return undefined;
  }

  private parseStatus(v?: string): MemberStatus | undefined {
    if (!v) return undefined;
    const s = v.trim().toUpperCase().replace(/\s+/g, '_');
    const map: Record<string, MemberStatus> = {
      VISITOR: 'VISITOR',
      NEW_MEMBER: 'NEW_MEMBER',
      NEWMEMBER: 'NEW_MEMBER',
      ACTIVE: 'ACTIVE_MEMBER',
      ACTIVE_MEMBER: 'ACTIVE_MEMBER',
      DISCIPLED: 'DISCIPLED',
    };
    return map[s] ?? (['VISITOR', 'NEW_MEMBER', 'ACTIVE_MEMBER', 'DISCIPLED'].includes(s) ? (s as MemberStatus) : undefined);
  }

  private parseRoles(v?: string): MemberRoleType[] | undefined {
    if (!v?.trim()) return undefined;
    const valid = new Set<MemberRoleType>([
      'YOUTH',
      'ADULT',
      'LEADER',
      'DRIVER',
      'EVANGELIST',
      'ADMIN',
      'PASTOR',
    ]);
    const roles = v
      .split(/[,;|]/)
      .map((r) => r.trim().toUpperCase().replace(/\s+/g, '_'))
      .filter((r): r is MemberRoleType => valid.has(r as MemberRoleType));
    return roles.length ? roles : undefined;
  }

  private parseFollowUpStage(v?: string): FollowUpStage | undefined {
    if (!v) return undefined;
    const s = v.trim().toUpperCase().replace(/\s+/g, '_');
    const allowed: FollowUpStage[] = [
      'NEW_LEAD',
      'CONTACTED',
      'VISITED',
      'ATTENDED',
      'JOINED_GROUP',
    ];
    return allowed.includes(s as FollowUpStage) ? (s as FollowUpStage) : undefined;
  }
}
