import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsentType, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  DEFAULT_LANDING_MEMBERSHIP_FORM,
  applyTemplateVars,
  landingMembershipFormSchema,
  type LandingMembershipFormConfig,
} from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import { MembershipService } from '../membership/membership.service';
import { ServiceUnitsService } from '../service-units/service-units.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { PlatformPrivacyService } from '../platform/platform-privacy.service';
import { PublicMembershipRegisterDto } from './dto/public-membership-register.dto';

const SETTINGS_MEMBERSHIP_FORM_KEY = 'landingMembershipForm';

function mergeFormConfig(
  stored?: Partial<LandingMembershipFormConfig> | null,
): LandingMembershipFormConfig {
  if (!stored || typeof stored !== 'object') {
    return { ...DEFAULT_LANDING_MEMBERSHIP_FORM };
  }
  const parsed = landingMembershipFormSchema.safeParse({
    ...DEFAULT_LANDING_MEMBERSHIP_FORM,
    ...stored,
  });
  return parsed.success ? parsed.data : { ...DEFAULT_LANDING_MEMBERSHIP_FORM };
}

@Injectable()
export class LandingMembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipService: MembershipService,
    private readonly serviceUnits: ServiceUnitsService,
    private readonly email: EmailAdapter,
    private readonly privacy: PlatformPrivacyService,
  ) {}

  readFormConfig(settings: unknown): LandingMembershipFormConfig {
    const raw = settings as Prisma.JsonObject | null;
    const stored = raw?.[SETTINGS_MEMBERSHIP_FORM_KEY];
    return mergeFormConfig(
      stored && typeof stored === 'object'
        ? (stored as Partial<LandingMembershipFormConfig>)
        : null,
    );
  }

  async resetAdminForm(churchId: string) {
    return this.updateAdminForm(churchId, DEFAULT_LANDING_MEMBERSHIP_FORM);
  }

  async getAdminForm(churchId: string) {
    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');
    return {
      form: this.readFormConfig(church.settings),
      defaults: DEFAULT_LANDING_MEMBERSHIP_FORM,
    };
  }

  async updateAdminForm(churchId: string, body: unknown) {
    const parsed = landingMembershipFormSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');
    const settings = (church.settings as Prisma.JsonObject) ?? {};
    await this.prisma.church.update({
      where: { id: churchId },
      data: {
        settings: {
          ...settings,
          [SETTINGS_MEMBERSHIP_FORM_KEY]: parsed.data as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: 'ADMIN' } } },
      },
      select: { id: true },
    });
    await Promise.all(
      admins.map((user) =>
        this.prisma.notification.create({
          data: {
            churchId,
            userId: user.id,
            type: 'LANDING_MEMBERSHIP_FORM_PUBLISHED',
            title: 'Membership form saved',
            body: 'Public membership registration form settings were saved and published on the church landing page.',
            data: { source: 'landing-membership-form' } as Prisma.InputJsonValue,
          },
        }),
      ),
    );

    return { form: parsed.data };
  }

  async getPublicForm(slug: string) {
    const church = await this.prisma.church.findUnique({
      where: { slug, isActive: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    const units = await this.serviceUnits.listUnits(church.id);
    return {
      churchName: church.name,
      slug: church.slug,
      form: this.readFormConfig(church.settings),
      serviceUnits: units.map((u) => ({
        id: u.id,
        name: u.name,
        description: u.description,
      })),
    };
  }

  private generateTempPassword(): string {
    return randomBytes(9).toString('base64url').slice(0, 12);
  }

  private async notifyChurchStaff(params: {
    churchId: string;
    churchName: string;
    title: string;
    body: string;
    emailSubject: string;
    emailBody: string;
  }) {
    const staff = await this.prisma.user.findMany({
      where: {
        churchId: params.churchId,
        isActive: true,
        roles: {
          some: {
            role: {
              name: { in: ['ADMIN', 'PASTOR'] },
            },
          },
        },
      },
      select: { id: true, email: true, firstName: true },
    });

    for (const user of staff) {
      await this.prisma.notification.create({
        data: {
          churchId: params.churchId,
          userId: user.id,
          type: 'LANDING_MEMBERSHIP_REGISTRATION',
          title: params.title,
          body: params.body,
          data: { source: 'landing' } as Prisma.InputJsonValue,
        },
      });
      if (user.email) {
        await this.email.send({
          churchId: params.churchId,
          to: user.email,
          subject: params.emailSubject,
          body: params.emailBody,
        });
      }
    }
  }

  async registerFromLanding(
    slug: string,
    dto: PublicMembershipRegisterDto,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const church = await this.prisma.church.findUnique({
      where: { slug, isActive: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    if (dto.acceptedTerms !== true || dto.acceptedPrivacy !== true) {
      throw new BadRequestException('You must accept the Terms of Service and Privacy Policy');
    }

    const form = this.readFormConfig(church.settings);
    const email = dto.email?.trim().toLowerCase();

    if (form.requireEmail && !email) {
      throw new BadRequestException('Email is required to complete registration');
    }

    if (form.createPortalAccount && !email) {
      throw new BadRequestException('Email is required to create your member portal account');
    }

    if (email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { churchId: church.id, email },
      });
      if (existingUser) {
        throw new ConflictException('An account with this email already exists. Please sign in.');
      }
    }

    const unitIds = [...new Set(dto.serviceUnitIds ?? [])];
    if (unitIds.length > 0) {
      const validCount = await this.prisma.serviceUnit.count({
        where: { churchId: church.id, isActive: true, id: { in: unitIds } },
      });
      if (validCount !== unitIds.length) {
        throw new BadRequestException('One or more selected service units are invalid');
      }
    }

    let userId: string | undefined;
    let tempPassword: string | undefined;

    if (email && form.createPortalAccount) {
      tempPassword = this.generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      const memberRole = await this.prisma.role.findFirst({ where: { name: 'MEMBER' } });
      const user = await this.prisma.user.create({
        data: {
          churchId: church.id,
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone?.trim(),
          roles: memberRole ? { create: { roleId: memberRole.id } } : undefined,
        },
      });
      userId = user.id;
    }

    const noteParts = [
      'Registered via public church landing page.',
      dto.bornAgain != null ? `Born again: ${dto.bornAgain ? 'Yes' : 'No'}` : null,
      dto.baptizedInHolySpirit != null
        ? `Baptized in the Holy Spirit: ${dto.baptizedInHolySpirit ? 'Yes' : 'No'}`
        : null,
      dto.notes?.trim(),
    ].filter(Boolean);

    const member = await this.membershipService.createMember(church.id, {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: email || undefined,
      phone: dto.phone?.trim() || undefined,
      address: dto.address?.trim() || undefined,
      city: dto.city?.trim() || undefined,
      notes: noteParts.join(' '),
      status: 'VISITOR',
      roles: ['ADULT'],
      startOnboarding: true,
      bornAgain: dto.bornAgain,
      baptizedInHolySpirit: dto.baptizedInHolySpirit,
      userId,
    });

    const consentRows: Array<{ consentType: ConsentType; documentSlug: string }> = [
      { consentType: ConsentType.TERMS, documentSlug: 'terms-of-service' },
      { consentType: ConsentType.PRIVACY, documentSlug: 'privacy-policy' },
    ];
    if (dto.acceptedMarketing === true) {
      consentRows.push({
        consentType: ConsentType.MARKETING,
        documentSlug: 'privacy-policy',
      });
    }
    await this.privacy.recordConsents({
      userId: userId ?? null,
      churchId: church.id,
      email: email ?? null,
      consents: consentRows,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const unitNames: string[] = [];
    for (const serviceUnitId of unitIds) {
      const unit = await this.prisma.serviceUnit.findFirst({
        where: { id: serviceUnitId, churchId: church.id },
      });
      if (!unit) continue;
      unitNames.push(unit.name);
      const request = await this.prisma.serviceUnitJoinRequest.create({
        data: {
          churchId: church.id,
          serviceUnitId,
          memberId: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          motivation: 'Selected during membership registration on church landing page.',
        },
        include: { serviceUnit: { select: { name: true } } },
      });
      await this.serviceUnits.notifyJoinRequestCreated(church.id, serviceUnitId, request);
    }

    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
    const loginUrl = `${appUrl}/login?church=${encodeURIComponent(church.slug)}`;
    const membershipUrl = `${appUrl}/dashboard/membership`;
    const memberName = `${member.firstName} ${member.lastName}`;
    const templateVars = {
      churchName: church.name,
      firstName: member.firstName,
      lastName: member.lastName,
      memberName,
      email: email ?? '—',
      phone: member.phone ?? '—',
      bornAgain: dto.bornAgain == null ? '—' : dto.bornAgain ? 'Yes' : 'No',
      baptizedInHolySpirit:
        dto.baptizedInHolySpirit == null ? '—' : dto.baptizedInHolySpirit ? 'Yes' : 'No',
      serviceUnits: unitNames.length ? unitNames.join(', ') : '—',
      loginUrl,
      membershipUrl,
      tempPassword: tempPassword ?? '—',
    };

    await this.notifyChurchStaff({
      churchId: church.id,
      churchName: church.name,
      title: `New membership registration: ${memberName}`,
      body: `${memberName} registered via the public landing page. Review them in Membership.`,
      emailSubject: applyTemplateVars(form.staffEmailSubject, templateVars),
      emailBody: applyTemplateVars(form.staffEmailBody, templateVars),
    });

    if (email) {
      const registrantSubject = tempPassword
        ? applyTemplateVars(form.registrantEmailSubject, templateVars)
        : `Thank you for registering with ${church.name}`;
      const registrantBody = tempPassword
        ? applyTemplateVars(form.registrantEmailBody, templateVars)
        : `Hello ${member.firstName},\n\nThank you for registering with ${church.name}. Our team will be in touch soon.\n\nBlessings,\n${church.name}`;

      await this.email.send({
        churchId: church.id,
        to: email,
        subject: registrantSubject,
        body: registrantBody,
      });

      if (userId) {
        await this.prisma.notification.create({
          data: {
            churchId: church.id,
            userId,
            type: 'LANDING_MEMBERSHIP_WELCOME',
            title: 'Welcome — your registration was received',
            body: `Thank you for registering. Use the email we sent with your temporary password to sign in.`,
            data: { memberId: member.id } as Prisma.InputJsonValue,
          },
        });
      }
    }

    return {
      id: member.id,
      message: 'Thank you! Your membership registration has been received.',
      emailSent: !!email,
      portalAccountCreated: !!tempPassword,
    };
  }
}
