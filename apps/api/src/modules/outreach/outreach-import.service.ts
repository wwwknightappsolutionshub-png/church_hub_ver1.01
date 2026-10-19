import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OutreachImportJobStatus, OutreachImportRowAction, Prisma } from '@prisma/client';
import {
  OutreachImportColumnMappingSchema,
  OutreachImportOptionsSchema,
  buildOutreachImportTemplateCsv,
  normalizeFlexiblePhone,
  parseCsvBoolean,
  suggestOutreachColumnMapping,
  validateOutreachImportMappedRow,
  type OutreachImportColumnMapping,
  type OutreachImportMappedRow,
  type OutreachImportOptions,
} from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import { parseCsvText } from '../membership/membership-import-csv.util';
import { OutreachService } from './outreach.service';
import { decryptOutreachPii } from './outreach-pii.crypto';

type RowCounts = {
  total: number;
  create: number;
  skip: number;
  error: number;
};

@Injectable()
export class OutreachImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outreach: OutreachService,
  ) {}

  getTemplateCsv(): string {
    return buildOutreachImportTemplateCsv();
  }

  async upload(churchId: string, userId: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('CSV file is required');
    const text = file.buffer.toString('utf8');
    const { headers, rows } = parseCsvText(text);
    if (!headers.length) throw new BadRequestException('CSV has no header row');
    if (!rows.length) throw new BadRequestException('CSV has no data rows');

    const suggested = suggestOutreachColumnMapping(headers);
    const job = await this.prisma.outreachImportJob.create({
      data: {
        churchId,
        uploadedByUserId: userId,
        status: 'UPLOADED',
        sourceFilename: file.originalname ?? 'outreach-import.csv',
        columnMapping: suggested as Prisma.InputJsonValue,
        rowCounts: { total: rows.length, create: 0, skip: 0, error: 0 },
      },
    });

    await this.prisma.outreachImportJobRow.createMany({
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
      suggestedMapping: suggested,
      rowCount: rows.length,
    };
  }

  async preview(
    churchId: string,
    jobId: string,
    body: {
      columnMapping: OutreachImportColumnMapping;
      options?: OutreachImportOptions;
    },
  ) {
    const mapping = OutreachImportColumnMappingSchema.parse(body.columnMapping);
    if (!mapping.firstName?.trim() || !mapping.phone?.trim()) {
      throw new BadRequestException('Column mapping must include first name and phone');
    }
    const options = OutreachImportOptionsSchema.parse(body.options ?? {});

    const job = await this.getJobOrThrow(churchId, jobId);
    if (job.status === 'COMMITTED') {
      throw new BadRequestException('Import job already committed');
    }

    const rows = await this.prisma.outreachImportJobRow.findMany({
      where: { jobId },
      orderBy: { rowIndex: 'asc' },
    });

    const existingPhones = options.skipExistingPhone
      ? await this.loadExistingPhoneKeys(churchId)
      : new Set<string>();
    const seenInFile = new Set<string>();
    const counts: RowCounts = { total: rows.length, create: 0, skip: 0, error: 0 };
    const previewRows: Array<{
      rowIndex: number;
      action: OutreachImportRowAction | null;
      error: string | null;
      mapped: Partial<OutreachImportMappedRow>;
      raw: Record<string, string>;
    }> = [];

    for (const row of rows) {
      const raw = row.raw as Record<string, string>;
      const { mapped, error: mapError } = this.mapRow(raw, mapping);
      let action: OutreachImportRowAction | null = null;
      let error: string | null = mapError;

      if (!error) {
        const validated = validateOutreachImportMappedRow(mapped);
        if (!validated.success) {
          action = 'ERROR';
          error =
            validated.error.issues[0]?.message ??
            'Invalid outreach contact row';
        } else {
          const normalized = validated.data;
          mapped.phone = normalized.phone;
          mapped.firstName = normalized.firstName;
          if (normalized.lastName) mapped.lastName = normalized.lastName;
          if (normalized.email) mapped.email = normalized.email;
          if (normalized.referredBy) mapped.referredBy = normalized.referredBy;
          if (normalized.notes) mapped.notes = normalized.notes;
          if (normalized.postcode) mapped.postcode = normalized.postcode;
          if (normalized.locationLabel) mapped.locationLabel = normalized.locationLabel;
          if (normalized.addressStreet) mapped.addressStreet = normalized.addressStreet;
          if (normalized.addressCity) mapped.addressCity = normalized.addressCity;
          if (normalized.addressState) mapped.addressState = normalized.addressState;
          if (normalized.addressCountry) mapped.addressCountry = normalized.addressCountry;
          if (normalized.addressPostal) mapped.addressPostal = normalized.addressPostal;
          if (normalized.needsBusPickup != null) mapped.needsBusPickup = normalized.needsBusPickup;
          if (normalized.pickupAddress) mapped.pickupAddress = normalized.pickupAddress;
          if (normalized.busPickupNotes) mapped.busPickupNotes = normalized.busPickupNotes;

          const phoneKey = this.phoneKey(normalized.phone);
          if (options.skipDuplicatesInFile && phoneKey && seenInFile.has(phoneKey)) {
            action = 'SKIP';
            error = 'Duplicate phone in this file';
          } else if (options.skipExistingPhone && phoneKey && existingPhones.has(phoneKey)) {
            action = 'SKIP';
            error = 'Phone already exists in outreach contacts';
          } else {
            if (phoneKey) seenInFile.add(phoneKey);
            action = 'CREATE';
          }
        }
      } else {
        action = 'ERROR';
      }

      if (action === 'CREATE') counts.create++;
      else if (action === 'SKIP') counts.skip++;
      else if (action === 'ERROR') counts.error++;

      previewRows.push({
        rowIndex: row.rowIndex,
        action,
        error,
        mapped,
        raw,
      });

      await this.prisma.outreachImportJobRow.update({
        where: { id: row.id },
        data: {
          mapped: mapped as Prisma.InputJsonValue,
          action,
          error,
        },
      });
    }

    await this.prisma.outreachImportJob.update({
      where: { id: jobId },
      data: {
        status: 'PREVIEWED',
        columnMapping: mapping as Prisma.InputJsonValue,
        options: options as Prisma.InputJsonValue,
        rowCounts: counts as Prisma.InputJsonValue,
      },
    });

    return {
      jobId,
      status: 'PREVIEWED' as OutreachImportJobStatus,
      headers: Object.keys((rows[0]?.raw as Record<string, string>) ?? {}),
      suggestedMapping: mapping,
      rows: previewRows,
      rowCounts: counts,
    };
  }

  async commit(churchId: string, jobId: string, userId: string) {
    const job = await this.getJobOrThrow(churchId, jobId);
    if (job.status !== 'PREVIEWED') {
      throw new BadRequestException('Preview the import before committing');
    }

    const rows = await this.prisma.outreachImportJobRow.findMany({
      where: { jobId, action: 'CREATE' },
      orderBy: { rowIndex: 'asc' },
    });

    let created = 0;
    let failed = 0;
    const skipCount =
      ((job.rowCounts as RowCounts | null)?.skip ?? 0) +
      ((job.rowCounts as RowCounts | null)?.error ?? 0);

    for (const row of rows) {
      const mapped = row.mapped as Partial<OutreachImportMappedRow>;
      try {
        const contact = await this.outreach.captureContact(churchId, {
          firstName: mapped.firstName!,
          lastName: mapped.lastName,
          phone: mapped.phone!,
          email: mapped.email,
          referredBy: mapped.referredBy,
          notes: mapped.notes,
          postcode: mapped.postcode,
          locationLabel: mapped.locationLabel,
          addressStreet: mapped.addressStreet,
          addressCity: mapped.addressCity,
          addressState: mapped.addressState,
          addressCountry: mapped.addressCountry,
          addressPostal: mapped.addressPostal,
          needsBusPickup: mapped.needsBusPickup,
          pickupAddress: mapped.pickupAddress,
          busPickupNotes: mapped.busPickupNotes,
          photoConsent: false,
          sendWelcome: false,
          capturedByUserId: userId,
        });
        created++;
        await this.prisma.outreachImportJobRow.update({
          where: { id: row.id },
          data: { contactId: (contact as { id?: string })?.id ?? null },
        });
      } catch (err) {
        failed++;
        await this.prisma.outreachImportJobRow.update({
          where: { id: row.id },
          data: {
            action: 'ERROR',
            error: err instanceof Error ? err.message : 'Failed to create contact',
          },
        });
      }
    }

    const summary = {
      created,
      skipped: skipCount,
      failed,
    };

    await this.prisma.outreachImportJob.update({
      where: { id: jobId },
      data: {
        status: 'COMMITTED',
        committedAt: new Date(),
        summary: summary as Prisma.InputJsonValue,
      },
    });

    return {
      jobId,
      status: 'COMMITTED' as OutreachImportJobStatus,
      summary,
    };
  }

  async getJob(churchId: string, jobId: string) {
    const job = await this.getJobOrThrow(churchId, jobId);
    const rows = await this.prisma.outreachImportJobRow.findMany({
      where: { jobId },
      orderBy: { rowIndex: 'asc' },
      take: 100,
    });
    return { ...job, sampleRows: rows };
  }

  private async getJobOrThrow(churchId: string, jobId: string) {
    const job = await this.prisma.outreachImportJob.findFirst({
      where: { id: jobId, churchId },
    });
    if (!job) throw new NotFoundException('Import job not found');
    return job;
  }

  private mapRow(
    raw: Record<string, string>,
    mapping: OutreachImportColumnMapping,
  ): { mapped: Partial<OutreachImportMappedRow>; error: string | null } {
    const pick = (field: keyof OutreachImportColumnMapping) => {
      const header = mapping[field];
      if (!header) return undefined;
      const v = raw[header];
      return v != null && String(v).trim() ? String(v).trim() : undefined;
    };

    const firstName = pick('firstName');
    const phone = pick('phone');
    if (!firstName) return { mapped: {}, error: 'First name is required' };
    if (!phone) return { mapped: {}, error: 'Phone is required' };

    const needsBus = parseCsvBoolean(pick('needsBusPickup'));
    const mapped: Partial<OutreachImportMappedRow> = {
      firstName,
      lastName: pick('lastName'),
      phone,
      email: pick('email'),
      referredBy: pick('referredBy'),
      notes: pick('notes'),
      postcode: pick('postcode'),
      locationLabel: pick('locationLabel'),
      addressStreet: pick('addressStreet'),
      addressCity: pick('addressCity'),
      addressState: pick('addressState'),
      addressCountry: pick('addressCountry'),
      addressPostal: pick('addressPostal'),
      needsBusPickup: needsBus,
      pickupAddress: pick('pickupAddress'),
      busPickupNotes: pick('busPickupNotes'),
    };
    return { mapped, error: null };
  }

  private phoneKey(phone: string | undefined): string | null {
    if (!phone) return null;
    const n = normalizeFlexiblePhone(phone) ?? phone.replace(/[^\d+]/g, '');
    return n ? n.toLowerCase() : null;
  }

  private async loadExistingPhoneKeys(churchId: string): Promise<Set<string>> {
    const contacts = await this.prisma.outreachContact.findMany({
      where: { churchId },
      select: { phone: true },
      take: 10_000,
      orderBy: { capturedAt: 'desc' },
    });
    const keys = new Set<string>();
    for (const c of contacts) {
      const plain = decryptOutreachPii(c.phone);
      const key = this.phoneKey(plain ?? undefined);
      if (key) keys.add(key);
    }
    return keys;
  }
}
