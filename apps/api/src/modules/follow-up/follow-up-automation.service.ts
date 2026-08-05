import { Injectable, Logger } from '@nestjs/common';
import { FollowUpAutomationTrigger, FollowUpStage, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { NotificationsQueueService } from '../notifications/notifications-queue.service';
import { DEFAULT_FOLLOW_UP_AUTOMATION_RULES } from './follow-up-automation.constants';

function channelUsesEmail(channel: string) {
  const c = channel.toUpperCase();
  return c === 'EMAIL' || c === 'BOTH' || c === 'ALL';
}

function channelUsesWhatsApp(channel: string) {
  const c = channel.toUpperCase();
  return c === 'WHATSAPP' || c === 'SMS' || c === 'BOTH' || c === 'ALL';
}

@Injectable()
export class FollowUpAutomationService {
  private readonly logger = new Logger(FollowUpAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsQueueService,
  ) {}

  async listRules(churchId: string) {
    const count = await this.prisma.followUpAutomationRule.count({ where: { churchId } });
    if (count === 0) {
      await this.prisma.followUpAutomationRule.createMany({
        data: DEFAULT_FOLLOW_UP_AUTOMATION_RULES.map((r) => ({
          churchId,
          ...r,
        })),
      });
    } else {
      await this.ensureWelcomeDefaults(churchId);
    }
    return this.prisma.followUpAutomationRule.findMany({
      where: { churchId },
      orderBy: [{ trigger: 'asc' }, { delayHours: 'asc' }],
    });
  }

  /**
   * Existing churches seeded before email welcome / immediate delay:
   * force Welcome WhatsApp to 0h and add Welcome Email if missing.
   */
  private async ensureWelcomeDefaults(churchId: string) {
    await this.prisma.followUpAutomationRule.updateMany({
      where: {
        churchId,
        trigger: 'NEW_LEAD',
        channel: 'WHATSAPP',
        name: 'Welcome new lead (WhatsApp)',
      },
      data: { delayHours: 0, isActive: true },
    });

    const hasEmailWelcome = await this.prisma.followUpAutomationRule.findFirst({
      where: {
        churchId,
        trigger: 'NEW_LEAD',
        channel: 'EMAIL',
      },
      select: { id: true },
    });
    if (!hasEmailWelcome) {
      const emailDefault = DEFAULT_FOLLOW_UP_AUTOMATION_RULES.find(
        (r) => r.trigger === 'NEW_LEAD' && r.channel === 'EMAIL',
      );
      if (emailDefault) {
        await this.prisma.followUpAutomationRule.create({
          data: { churchId, ...emailDefault },
        });
      }
    }
  }

  async upsertRule(
    churchId: string,
    data: {
      id?: string;
      name: string;
      trigger: FollowUpAutomationTrigger;
      stage?: FollowUpStage | null;
      delayHours: number;
      channel: string;
      message?: string;
      templateId?: string;
      notifyAssignee?: boolean;
      isActive?: boolean;
    },
  ) {
    if (data.id) {
      return this.prisma.followUpAutomationRule.update({
        where: { id: data.id },
        data: {
          name: data.name,
          trigger: data.trigger,
          stage: data.stage ?? null,
          delayHours: data.delayHours,
          channel: data.channel,
          message: data.message,
          templateId: data.templateId,
          notifyAssignee: data.notifyAssignee ?? true,
          isActive: data.isActive ?? true,
        },
      });
    }
    return this.prisma.followUpAutomationRule.create({
      data: {
        churchId,
        name: data.name,
        trigger: data.trigger,
        stage: data.stage ?? null,
        delayHours: data.delayHours,
        channel: data.channel,
        message: data.message,
        templateId: data.templateId,
        notifyAssignee: data.notifyAssignee ?? true,
        isActive: data.isActive ?? true,
      },
    });
  }

  /** Run matching rules after lead create or stage change (delayed enqueue). */
  async onFollowUpEvent(
    churchId: string,
    followUpId: string,
    event: 'NEW_LEAD' | { stage: FollowUpStage },
  ) {
    const followUp = await this.prisma.followUp.findFirst({
      where: { id: followUpId, churchId },
      include: { church: { select: { name: true } } },
    });
    if (!followUp) return;

    const trigger: FollowUpAutomationTrigger =
      event === 'NEW_LEAD' ? 'NEW_LEAD' : 'STAGE_ENTER';
    const stage = event === 'NEW_LEAD' ? undefined : event.stage;

    // Ensure welcome email rule exists before matching (capture/manual create paths).
    if (trigger === 'NEW_LEAD') {
      await this.ensureWelcomeDefaults(churchId);
    }

    const rules = await this.prisma.followUpAutomationRule.findMany({
      where: {
        churchId,
        isActive: true,
        trigger,
        ...(stage ? { stage } : {}),
      },
    });

    for (const rule of rules) {
      const already = await this.prisma.followUpAutomationRun.findUnique({
        where: { ruleId_followUpId: { ruleId: rule.id, followUpId } },
      });
      if (already) continue;

      const body = (rule.message ?? '')
        .replace(/\{\{name\}\}/gi, followUp.contactName)
        .replace(/\{\{church\}\}/gi, followUp.church.name);

      const useEmail = channelUsesEmail(rule.channel);
      const useWhatsApp = channelUsesWhatsApp(rule.channel);
      if (useEmail && !followUp.contactEmail && useWhatsApp && !followUp.contactPhone) {
        continue;
      }
      if (useEmail && !useWhatsApp && !followUp.contactEmail) {
        continue;
      }
      if (useWhatsApp && !useEmail && !followUp.contactPhone) {
        continue;
      }

      const remindAt = new Date(Date.now() + rule.delayHours * 60 * 60 * 1000);
      const reminder = await this.prisma.followUpReminder.create({
        data: {
          followUpId,
          remindAt,
          channel: rule.channel,
          message: body,
        },
      });

      await this.notifications.scheduleFollowUpReminder({
        churchId,
        followUpId,
        reminderId: reminder.id,
        body,
        subject: `Follow-up: ${followUp.contactName}`,
        remindAt,
        contactEmail: useEmail ? followUp.contactEmail : null,
        contactPhone: useWhatsApp ? followUp.contactPhone : null,
        assignedToId: rule.notifyAssignee ? followUp.assignedToId : null,
      });

      await this.prisma.followUpAutomationRun.create({
        data: { ruleId: rule.id, followUpId },
      });

      this.logger.debug(`Automation "${rule.name}" scheduled for follow-up ${followUpId}`);
    }
  }

  /** Process overdue leads — idempotent per rule via automation_runs. */
  async processOverdueRules() {
    const rules = await this.prisma.followUpAutomationRule.findMany({
      where: { isActive: true, trigger: 'OVERDUE' },
    });
    if (!rules.length) return;

    const now = new Date();
    for (const rule of rules) {
      const overdue = await this.prisma.followUp.findMany({
        where: {
          churchId: rule.churchId,
          stage: { not: 'JOINED_GROUP' },
          dueAt: { lt: now },
        },
        take: 50,
      });

      for (const fu of overdue) {
        const ran = await this.prisma.followUpAutomationRun.findUnique({
          where: { ruleId_followUpId: { ruleId: rule.id, followUpId: fu.id } },
        });
        if (ran) continue;

        const church = await this.prisma.church.findUnique({
          where: { id: rule.churchId },
          select: { name: true },
        });
        const body = (rule.message ?? '')
          .replace(/\{\{name\}\}/gi, fu.contactName)
          .replace(/\{\{church\}\}/gi, church?.name ?? 'Church');

        if (rule.notifyAssignee && fu.assignedToId) {
          await this.prisma.notification.create({
            data: {
              churchId: rule.churchId,
              userId: fu.assignedToId,
              title: 'Overdue follow-up',
              body,
              type: 'FOLLOW_UP_OVERDUE',
              data: { followUpId: fu.id } as Prisma.InputJsonValue,
            },
          });
        }

        const useEmail = channelUsesEmail(rule.channel);
        const useWhatsApp = channelUsesWhatsApp(rule.channel);

        if (
          (useWhatsApp && fu.contactPhone) ||
          (useEmail && fu.contactEmail)
        ) {
          const reminder = await this.prisma.followUpReminder.create({
            data: {
              followUpId: fu.id,
              remindAt: now,
              channel: rule.channel,
              message: body,
            },
          });
          await this.notifications.scheduleFollowUpReminder({
            churchId: rule.churchId,
            followUpId: fu.id,
            reminderId: reminder.id,
            body,
            remindAt: now,
            contactPhone: useWhatsApp ? fu.contactPhone : null,
            contactEmail: useEmail ? fu.contactEmail : null,
            assignedToId: fu.assignedToId,
          });
        }

        await this.prisma.followUpAutomationRun.create({
          data: { ruleId: rule.id, followUpId: fu.id },
        });
      }
    }
  }
}
