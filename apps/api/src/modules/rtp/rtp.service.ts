import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RtpFieldType, RtpRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { ModuleAccessService } from '../access/module-access.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';

const DEFAULT_FIELDS: Array<{
  fieldKey: string;
  label: string;
  fieldType: RtpFieldType;
  sectionKey: string;
  sectionLabel: string;
  sortOrder: number;
  isRequired: boolean;
  options?: string[];
}> = [
  {
    fieldKey: 'request_title',
    label: 'Request title',
    fieldType: 'TEXT',
    sectionKey: 'overview',
    sectionLabel: '1. Request overview',
    sortOrder: 10,
    isRequired: true,
  },
  {
    fieldKey: 'purpose',
    label: 'Purpose / justification',
    fieldType: 'TEXTAREA',
    sectionKey: 'overview',
    sectionLabel: '1. Request overview',
    sortOrder: 20,
    isRequired: true,
  },
  {
    fieldKey: 'priority',
    label: 'Priority',
    fieldType: 'SELECT',
    sectionKey: 'overview',
    sectionLabel: '1. Request overview',
    sortOrder: 30,
    isRequired: true,
    options: ['Low', 'Normal', 'Urgent'],
  },
  {
    fieldKey: 'item_description',
    label: 'Item / service description',
    fieldType: 'TEXTAREA',
    sectionKey: 'items',
    sectionLabel: '2. Items to purchase',
    sortOrder: 40,
    isRequired: true,
  },
  {
    fieldKey: 'quantity',
    label: 'Quantity',
    fieldType: 'NUMBER',
    sectionKey: 'items',
    sectionLabel: '2. Items to purchase',
    sortOrder: 50,
    isRequired: true,
  },
  {
    fieldKey: 'unit_cost',
    label: 'Estimated unit cost',
    fieldType: 'CURRENCY',
    sectionKey: 'items',
    sectionLabel: '2. Items to purchase',
    sortOrder: 60,
    isRequired: false,
  },
  {
    fieldKey: 'estimated_total',
    label: 'Estimated total',
    fieldType: 'CURRENCY',
    sectionKey: 'budget',
    sectionLabel: '3. Budget & supplier',
    sortOrder: 70,
    isRequired: true,
  },
  {
    fieldKey: 'budget_line',
    label: 'Budget line / cost centre',
    fieldType: 'TEXT',
    sectionKey: 'budget',
    sectionLabel: '3. Budget & supplier',
    sortOrder: 80,
    isRequired: false,
  },
  {
    fieldKey: 'preferred_supplier',
    label: 'Preferred supplier',
    fieldType: 'TEXT',
    sectionKey: 'budget',
    sectionLabel: '3. Budget & supplier',
    sortOrder: 90,
    isRequired: false,
  },
  {
    fieldKey: 'needed_by',
    label: 'Needed by',
    fieldType: 'DATE',
    sectionKey: 'delivery',
    sectionLabel: '4. Delivery & notes',
    sortOrder: 100,
    isRequired: false,
  },
  {
    fieldKey: 'delivery_location',
    label: 'Delivery location',
    fieldType: 'TEXT',
    sectionKey: 'delivery',
    sectionLabel: '4. Delivery & notes',
    sortOrder: 110,
    isRequired: false,
  },
  {
    fieldKey: 'additional_notes',
    label: 'Additional notes',
    fieldType: 'TEXTAREA',
    sectionKey: 'delivery',
    sectionLabel: '4. Delivery & notes',
    sortOrder: 120,
    isRequired: false,
  },
];

@Injectable()
export class RtpService {
  private readonly logger = new Logger(RtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleAccess: ModuleAccessService,
    private readonly commQueue: CommunicationsQueueService,
  ) {}

  private async requireStaff(userId: string, churchId: string) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx || !this.moduleAccess.isChurchStaff(ctx)) {
      throw new ForbiddenException('Church admin or pastor required');
    }
    return ctx;
  }

  private async requireUnitManager(userId: string, churchId: string, serviceUnitId: string) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx || !this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId)) {
      throw new ForbiddenException('Service unit admin or church staff required');
    }
    return ctx;
  }

  private async requireAdminOnly(userId: string, churchId: string) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx || !ctx.userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Church admin required to configure RTP fields');
    }
    return ctx;
  }

  async ensureDefaultFields(churchId: string) {
    const count = await this.prisma.rtpFormFieldDefinition.count({ where: { churchId } });
    if (count > 0) return;
    await this.prisma.rtpFormFieldDefinition.createMany({
      data: DEFAULT_FIELDS.map((f) => ({
        churchId,
        fieldKey: f.fieldKey,
        label: f.label,
        fieldType: f.fieldType,
        sectionKey: f.sectionKey,
        sectionLabel: f.sectionLabel,
        sortOrder: f.sortOrder,
        isRequired: f.isRequired,
        options: (f.options ?? []) as Prisma.InputJsonValue,
      })),
    });
  }

  async listFormFields(userId: string, churchId: string, activeOnly = true) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) throw new ForbiddenException('Access denied');
    await this.ensureDefaultFields(churchId);
    return this.prisma.rtpFormFieldDefinition.findMany({
      where: { churchId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async createFormField(
    userId: string,
    churchId: string,
    data: {
      fieldKey: string;
      label: string;
      fieldType?: RtpFieldType;
      sectionKey: string;
      sectionLabel: string;
      sortOrder?: number;
      isRequired?: boolean;
      options?: string[];
    },
  ) {
    await this.requireAdminOnly(userId, churchId);
    const fieldKey = data.fieldKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!fieldKey || !data.label.trim() || !data.sectionKey.trim()) {
      throw new BadRequestException('fieldKey, label, and sectionKey are required');
    }
    return this.prisma.rtpFormFieldDefinition.create({
      data: {
        churchId,
        fieldKey,
        label: data.label.trim(),
        fieldType: data.fieldType ?? 'TEXT',
        sectionKey: data.sectionKey.trim(),
        sectionLabel: data.sectionLabel.trim() || data.sectionKey.trim(),
        sortOrder: data.sortOrder ?? 0,
        isRequired: data.isRequired ?? false,
        options: (data.options ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  async updateFormField(
    userId: string,
    churchId: string,
    fieldId: string,
    data: Partial<{
      label: string;
      fieldType: RtpFieldType;
      sectionKey: string;
      sectionLabel: string;
      sortOrder: number;
      isRequired: boolean;
      isActive: boolean;
      options: string[];
    }>,
  ) {
    await this.requireAdminOnly(userId, churchId);
    const existing = await this.prisma.rtpFormFieldDefinition.findFirst({
      where: { id: fieldId, churchId },
    });
    if (!existing) throw new NotFoundException('RTP field not found');
    return this.prisma.rtpFormFieldDefinition.update({
      where: { id: fieldId },
      data: {
        label: data.label?.trim(),
        fieldType: data.fieldType,
        sectionKey: data.sectionKey?.trim(),
        sectionLabel: data.sectionLabel?.trim(),
        sortOrder: data.sortOrder,
        isRequired: data.isRequired,
        isActive: data.isActive,
        options:
          data.options !== undefined
            ? (data.options as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }

  async deleteFormField(userId: string, churchId: string, fieldId: string) {
    await this.requireAdminOnly(userId, churchId);
    const existing = await this.prisma.rtpFormFieldDefinition.findFirst({
      where: { id: fieldId, churchId },
    });
    if (!existing) throw new NotFoundException('RTP field not found');
    return this.prisma.rtpFormFieldDefinition.update({
      where: { id: fieldId },
      data: { isActive: false },
    });
  }

  async listUnitRequests(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    return this.prisma.rtpRequest.findMany({
      where: { churchId, serviceUnitId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        receivedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async listChurchRequests(userId: string, churchId: string) {
    await this.requireStaff(userId, churchId);
    return this.listRtpReports(churchId);
  }

  async listRtpReports(churchId: string) {
    return this.prisma.rtpRequest.findMany({
      where: { churchId },
      orderBy: { createdAt: 'desc' },
      take: 120,
      include: {
        serviceUnit: { select: { id: true, name: true, departmentCode: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        receivedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async submitRequest(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    data: { title?: string; fieldValues: Record<string, string | number | null> },
  ) {
    await this.requireUnitManager(userId, churchId, serviceUnitId);
    const unit = await this.prisma.serviceUnit.findFirst({
      where: { id: serviceUnitId, churchId, isActive: true },
      select: { id: true, name: true },
    });
    if (!unit) throw new NotFoundException('Service unit not found');

    const fields = await this.listFormFields(userId, churchId, true);
    const values = data.fieldValues ?? {};
    for (const field of fields) {
      if (!field.isRequired) continue;
      const raw = values[field.fieldKey];
      if (raw === undefined || raw === null || String(raw).trim() === '') {
        throw new BadRequestException(`Missing required field: ${field.label}`);
      }
    }

    const title =
      (data.title?.trim() ||
        String(values.request_title ?? '').trim() ||
        `RTP — ${unit.name}`).slice(0, 200);

    const now = new Date();
    const row = await this.prisma.rtpRequest.create({
      data: {
        churchId,
        serviceUnitId,
        submittedByUserId: userId,
        title,
        status: 'SUBMITTED',
        fieldValues: values as Prisma.InputJsonValue,
        nextReminderAt: new Date(now.getTime() + 15 * 60 * 1000),
      },
      include: {
        serviceUnit: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    try {
      await this.notifyLeadershipOfSubmission(churchId, row, fields);
    } catch (err) {
      this.logger.warn(
        `RTP notify failed for ${row.id}: ${err instanceof Error ? err.message : err}`,
      );
    }

    return row;
  }

  private buildTabularBody(
    fields: Array<{ fieldKey: string; label: string; sectionLabel: string }>,
    values: Record<string, unknown>,
    meta: { unitName: string; submitter: string; title: string; submittedAt: string },
  ) {
    const lines = [
      `RTP Request: ${meta.title}`,
      `Service Unit: ${meta.unitName}`,
      `Submitted by: ${meta.submitter}`,
      `Submitted at: ${meta.submittedAt}`,
      ``,
      `Field | Value`,
      `---|---`,
    ];
    for (const field of fields) {
      const raw = values[field.fieldKey];
      const display =
        raw === undefined || raw === null || String(raw).trim() === ''
          ? '—'
          : String(raw).replace(/\n/g, ' ');
      lines.push(`${field.label} | ${display}`);
    }
    return lines.join('\n');
  }

  private async notifyLeadershipOfSubmission(
    churchId: string,
    row: {
      id: string;
      title: string;
      fieldValues: Prisma.JsonValue;
      createdAt: Date;
      serviceUnit: { name: string };
      submittedBy: { firstName: string; lastName: string; email: string | null };
    },
    fields: Array<{ fieldKey: string; label: string; sectionLabel: string }>,
  ) {
    const values =
      row.fieldValues && typeof row.fieldValues === 'object' && !Array.isArray(row.fieldValues)
        ? (row.fieldValues as Record<string, unknown>)
        : {};
    const submitter = `${row.submittedBy.firstName} ${row.submittedBy.lastName}`.trim();
    const title = `[RTP Request] ${row.serviceUnit.name} — ${row.title}`;
    const body = this.buildTabularBody(fields, values, {
      unitName: row.serviceUnit.name,
      submitter,
      title: row.title,
      submittedAt: row.createdAt.toISOString(),
    });

    const staffUsers = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
    });

    for (const staff of staffUsers) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title,
        body,
        channels: ['IN_APP', 'EMAIL'],
        targetUserId: staff.id,
        metadata: {
          reportType: 'RTP Request',
          rtpRequestId: row.id,
          reminderType: 'RTP_SUBMITTED',
        },
      });
    }
  }

  async markReceived(userId: string, churchId: string, requestId: string) {
    await this.requireStaff(userId, churchId);
    const row = await this.prisma.rtpRequest.findFirst({
      where: { id: requestId, churchId },
      include: {
        serviceUnit: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!row) throw new NotFoundException('RTP request not found');
    if (row.status !== 'SUBMITTED') {
      throw new BadRequestException('Only submitted RTP requests can be marked received');
    }

    const updated = await this.prisma.rtpRequest.update({
      where: { id: requestId },
      data: {
        status: 'PROCESSING',
        receivedAt: new Date(),
        receivedByUserId: userId,
        processingNotifiedAt: new Date(),
        nextReminderAt: null,
      },
    });

    try {
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title: `RTP status: Processing — ${row.title}`,
        body: [
          `Your Request to Purchase for "${row.serviceUnit.name}" is now being processed.`,
          ``,
          `Title: ${row.title}`,
          `Status: Processing`,
          `Updated: ${new Date().toISOString()}`,
        ].join('\n'),
        channels: ['IN_APP', 'EMAIL'],
        targetUserId: row.submittedByUserId,
        metadata: {
          reportType: 'RTP Status',
          rtpRequestId: row.id,
          status: 'PROCESSING',
        },
      });
    } catch (err) {
      this.logger.warn(
        `RTP processing notify failed for ${row.id}: ${err instanceof Error ? err.message : err}`,
      );
    }

    return updated;
  }

  async approve(userId: string, churchId: string, requestId: string) {
    await this.requireStaff(userId, churchId);
    const row = await this.prisma.rtpRequest.findFirst({
      where: { id: requestId, churchId },
      include: { serviceUnit: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('RTP request not found');
    if (row.status === 'APPROVED' || row.status === 'REJECTED') {
      throw new BadRequestException('RTP request is already closed');
    }

    const updated = await this.prisma.rtpRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedByUserId: userId,
        nextReminderAt: null,
        ...(row.status === 'SUBMITTED'
          ? { receivedAt: new Date(), receivedByUserId: userId, processingNotifiedAt: new Date() }
          : {}),
      },
    });

    try {
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title: `RTP approved — ${row.title}`,
        body: [
          `Your Request to Purchase for "${row.serviceUnit.name}" has been approved.`,
          ``,
          `Title: ${row.title}`,
          `Status: Approved`,
        ].join('\n'),
        channels: ['IN_APP', 'EMAIL'],
        targetUserId: row.submittedByUserId,
        metadata: { reportType: 'RTP Status', rtpRequestId: row.id, status: 'APPROVED' },
      });
    } catch (err) {
      this.logger.warn(
        `RTP approved notify failed for ${row.id}: ${err instanceof Error ? err.message : err}`,
      );
    }

    return updated;
  }

  async reject(
    userId: string,
    churchId: string,
    requestId: string,
    reason?: string,
  ) {
    await this.requireStaff(userId, churchId);
    const row = await this.prisma.rtpRequest.findFirst({
      where: { id: requestId, churchId },
      include: { serviceUnit: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('RTP request not found');
    if (row.status === 'APPROVED' || row.status === 'REJECTED') {
      throw new BadRequestException('RTP request is already closed');
    }

    const updated = await this.prisma.rtpRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason?.trim() || null,
        approvedByUserId: userId,
        nextReminderAt: null,
      },
    });

    try {
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title: `RTP declined — ${row.title}`,
        body: [
          `Your Request to Purchase for "${row.serviceUnit.name}" was declined.`,
          ``,
          `Title: ${row.title}`,
          `Status: Rejected`,
          reason?.trim() ? `Reason: ${reason.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        channels: ['IN_APP', 'EMAIL'],
        targetUserId: row.submittedByUserId,
        metadata: { reportType: 'RTP Status', rtpRequestId: row.id, status: 'REJECTED' },
      });
    } catch (err) {
      this.logger.warn(
        `RTP reject notify failed for ${row.id}: ${err instanceof Error ? err.message : err}`,
      );
    }

    return updated;
  }

  /** Every ~5 minutes: remind ADMIN/PASTOR for SUBMITTED requests past nextReminderAt. */
  async runSlaReminders(now = new Date()) {
    const due = await this.prisma.rtpRequest.findMany({
      where: {
        status: 'SUBMITTED',
        nextReminderAt: { lte: now },
      },
      take: 40,
      include: {
        serviceUnit: { select: { name: true } },
        submittedBy: { select: { firstName: true, lastName: true } },
      },
    });

    let reminded = 0;
    for (const row of due) {
      const staffUsers = await this.prisma.user.findMany({
        where: {
          churchId: row.churchId,
          isActive: true,
          roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
        },
        select: { id: true },
      });

      const submitter = `${row.submittedBy.firstName} ${row.submittedBy.lastName}`.trim();
      const title = `Reminder: RTP awaiting receipt — ${row.title}`;
      const body = [
        `This Request to Purchase is still awaiting your "Received" action.`,
        ``,
        `Service Unit: ${row.serviceUnit.name}`,
        `Title: ${row.title}`,
        `Submitted by: ${submitter}`,
        `Submitted at: ${row.createdAt.toISOString()}`,
        ``,
        `Open Admin/Pastor Reports → RTP Requests and click Received.`,
      ].join('\n');

      const reminderKey = `rtp-sla:${row.id}:${now.toISOString().slice(0, 16)}`;

      for (const staff of staffUsers) {
        await this.commQueue.enqueue(row.churchId, {
          kind: 'DIRECT_ALERT',
          title,
          body,
          channels: ['IN_APP', 'EMAIL'],
          targetUserId: staff.id,
          metadata: {
            reportType: 'RTP Reminder',
            rtpRequestId: row.id,
            reminderKey,
            reminderType: 'RTP_SLA',
          },
        });
        reminded++;
      }

      await this.prisma.rtpRequest.update({
        where: { id: row.id },
        data: {
          lastReminderAt: now,
          nextReminderAt: new Date(now.getTime() + 15 * 60 * 1000),
        },
      });
    }

    return { due: due.length, reminded };
  }
}
