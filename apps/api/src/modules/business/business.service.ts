import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IdeaStatus, MarketplaceItemType, MentorshipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { CommunitySupportService } from '../community-support/community-support.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

const STAFF_NOTIFY_ROLES = ['ADMIN', 'PASTOR'] as const;

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communitySupport: CommunitySupportService,
    private readonly email: EmailAdapter,
  ) {}

  private maskMemberName(firstName: string, lastName: string) {
    const mask = (s: string) => (s.length ? `${s[0]}***` : '***');
    return `${mask(firstName.trim())} ${mask(lastName.trim())}`.trim();
  }

  private async requireAdmin(churchId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        churchId,
        isActive: true,
        roles: { some: { role: { name: 'ADMIN' } } },
      },
    });
    if (!user) throw new ForbiddenException('Church admin access required');
    return user;
  }

  private async notifyAdminAndPastor(params: {
    churchId: string;
    title: string;
    body: string;
    emailSubject: string;
    emailBody: string;
    notificationType: string;
    data?: Prisma.InputJsonValue;
  }) {
    const staff = await this.prisma.user.findMany({
      where: {
        churchId: params.churchId,
        isActive: true,
        roles: { some: { role: { name: { in: [...STAFF_NOTIFY_ROLES] } } } },
      },
      select: { id: true, email: true },
    });

    for (const user of staff) {
      try {
        await this.prisma.notification.create({
          data: {
            churchId: params.churchId,
            userId: user.id,
            type: params.notificationType,
            title: params.title,
            body: params.body,
            data: params.data ?? ({} as Prisma.InputJsonValue),
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
      } catch {
        // Do not fail mentor/mentee submissions if notifications or email fail.
      }
    }
  }

  async getStats(churchId: string) {
    const [profiles, verified, pending, listings, jobs, events, mentorships, ideas] = await Promise.all([
      this.prisma.businessProfile.count({ where: { churchId } }),
      this.prisma.businessProfile.count({ where: { churchId, verificationStatus: 'VERIFIED' } }),
      this.prisma.businessProfile.count({ where: { churchId, verificationStatus: 'PENDING' } }),
      this.prisma.marketplaceItem.count({ where: { churchId, isActive: true } }),
      this.prisma.jobPosting.count({ where: { churchId, isActive: true } }),
      this.prisma.konnectNetworkingEvent.count({
        where: { churchId, startsAt: { gte: new Date() }, isPublished: true },
      }),
      this.prisma.mentorshipLink.count({ where: { churchId, status: 'ACTIVE' } }),
      this.prisma.hubIdea.count({ where: { churchId, status: { not: 'RESOLVED' } } }),
    ]);
    return { profiles, verified, pending, listings, jobs, events, mentorships, ideas };
  }

  listProfiles(
    churchId: string,
    filters?: { verifiedOnly?: boolean; category?: string; search?: string; featured?: boolean },
  ) {
    const where: Prisma.BusinessProfileWhereInput = { churchId };
    if (filters?.verifiedOnly) where.verificationStatus = 'VERIFIED';
    if (filters?.category) where.category = filters.category;
    if (filters?.featured) where.isFeatured = true;
    if (filters?.search) {
      where.OR = [
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tagline: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.businessProfile.findMany({
      where,
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        listings: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { jobPostings: true, hostedEvents: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { businessName: 'asc' }],
    });
  }

  getProfile(churchId: string, id: string) {
    return this.prisma.businessProfile.findFirst({
      where: { id, churchId },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        listings: { where: { isActive: true } },
        jobPostings: { where: { isActive: true } },
        hostedEvents: { where: { isPublished: true }, orderBy: { startsAt: 'asc' }, take: 5 },
      },
    });
  }

  async createProfile(
    churchId: string,
    data: {
      memberId: string;
      businessName: string;
      tagline?: string;
      description?: string;
      category?: string;
      servicesOffered?: string[];
      website?: string;
      phone?: string;
      email?: string;
      address?: string;
      logoUrl?: string;
    },
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: data.memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');
    const existing = await this.prisma.businessProfile.findUnique({
      where: { memberId: data.memberId },
    });
    if (existing) {
      throw new BadRequestException('This member already has a business profile');
    }
    return this.prisma.businessProfile.create({
      data: { churchId, ...data },
      include: { member: { select: { firstName: true, lastName: true } } },
    });
  }

  async getMyBusinessProfile(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      include: {
        businessProfile: {
          include: { listings: { where: { isActive: true } } },
        },
      },
    });
    return member?.businessProfile ?? null;
  }

  async updateProfile(churchId: string, id: string, data: Prisma.BusinessProfileUpdateInput) {
    const existing = await this.prisma.businessProfile.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Business profile not found');
    return this.prisma.businessProfile.update({
      where: { id },
      data,
      include: { member: { select: { firstName: true, lastName: true } }, listings: true },
    });
  }

  async verifyProfile(churchId: string, id: string, status: 'VERIFIED' | 'REJECTED', rejectionNote?: string) {
    const existing = await this.prisma.businessProfile.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Business profile not found');
    return this.prisma.businessProfile.update({
      where: { id },
      data: {
        verificationStatus: status,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
        rejectionNote: status === 'REJECTED' ? rejectionNote : null,
      },
    });
  }

  async setFeatured(churchId: string, id: string, isFeatured: boolean) {
    const existing = await this.prisma.businessProfile.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Business profile not found');
    return this.prisma.businessProfile.update({ where: { id }, data: { isFeatured } });
  }

  listMarketplace(churchId: string, filters?: { itemType?: MarketplaceItemType; search?: string }) {
    return this.prisma.marketplaceItem.findMany({
      where: {
        churchId,
        isActive: true,
        business: { verificationStatus: 'VERIFIED' },
        ...(filters?.itemType ? { itemType: filters.itemType } : {}),
        ...(filters?.search
          ? {
              OR: [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        business: {
          select: { id: true, businessName: true, category: true, phone: true, email: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createListing(
    churchId: string,
    businessId: string,
    data: {
      title: string;
      description?: string;
      itemType?: MarketplaceItemType;
      price?: number;
      currency?: string;
      imageUrl?: string;
    },
  ) {
    const business = await this.prisma.businessProfile.findFirst({ where: { id: businessId, churchId } });
    if (!business) throw new NotFoundException('Business not found');
    return this.prisma.marketplaceItem.create({
      data: {
        churchId,
        businessId,
        title: data.title,
        description: data.description,
        itemType: data.itemType ?? 'SERVICE',
        price: data.price,
        currency: data.currency ?? 'GBP',
        imageUrl: data.imageUrl,
      },
    });
  }

  async updateListing(churchId: string, id: string, data: Prisma.MarketplaceItemUpdateInput) {
    const item = await this.prisma.marketplaceItem.findFirst({ where: { id, churchId } });
    if (!item) throw new NotFoundException('Listing not found');
    return this.prisma.marketplaceItem.update({ where: { id }, data });
  }

  async listJobs(churchId: string, activeOnly = true) {
    const [jobs, community] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where: { churchId, ...(activeOnly ? { isActive: true } : {}) },
        include: {
          business: {
            select: { id: true, businessName: true, category: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.communitySupport.listForKonnectJobBoard(churchId),
    ]);
    return [
      ...jobs.map((job) => ({ ...job, source: 'posting' as const })),
      ...community,
    ];
  }

  createJob(
    churchId: string,
    data: {
      title: string;
      description: string;
      businessId?: string;
      location?: string;
      jobType?: string;
      salaryRange?: string;
      contactEmail?: string;
      expiresAt?: string;
    },
  ) {
    return this.prisma.jobPosting.create({
      data: {
        churchId,
        title: data.title,
        description: data.description,
        businessId: data.businessId,
        location: data.location,
        jobType: data.jobType,
        salaryRange: data.salaryRange,
        contactEmail: data.contactEmail,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
      include: { business: true },
    });
  }

  async updateJob(churchId: string, id: string, data: Prisma.JobPostingUpdateInput) {
    const job = await this.prisma.jobPosting.findFirst({ where: { id, churchId } });
    if (!job) throw new NotFoundException('Job not found');
    return this.prisma.jobPosting.update({ where: { id }, data });
  }

  async deleteJob(churchId: string, id: string) {
    return this.updateJob(churchId, id, { isActive: false });
  }

  async deleteListing(churchId: string, id: string) {
    return this.updateListing(churchId, id, { isActive: false });
  }

  async deleteEvent(churchId: string, id: string) {
    const event = await this.prisma.konnectNetworkingEvent.findFirst({
      where: { id, churchId },
    });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.konnectNetworkingEvent.update({
      where: { id },
      data: { isPublished: false },
    });
  }

  listEvents(churchId: string, upcomingOnly = false) {
    return this.prisma.konnectNetworkingEvent.findMany({
      where: {
        churchId,
        isPublished: true,
        ...(upcomingOnly ? { startsAt: { gte: new Date() } } : {}),
      },
      include: {
        host: { select: { firstName: true, lastName: true } },
        business: { select: { businessName: true } },
        rsvps: { include: { member: { select: { firstName: true, lastName: true } } } },
        _count: { select: { rsvps: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  createEvent(
    churchId: string,
    data: {
      title: string;
      description?: string;
      location?: string;
      startsAt: string;
      endsAt?: string;
      maxAttendees?: number;
      hostMemberId?: string;
      businessId?: string;
    },
  ) {
    return this.prisma.konnectNetworkingEvent.create({
      data: {
        churchId,
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        maxAttendees: data.maxAttendees,
        hostMemberId: data.hostMemberId,
        businessId: data.businessId,
        isPublished: true,
      },
      include: { business: true, host: true },
    });
  }

  async updateEvent(churchId: string, id: string, data: Prisma.KonnectNetworkingEventUpdateInput) {
    const event = await this.prisma.konnectNetworkingEvent.findFirst({ where: { id, churchId } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.konnectNetworkingEvent.update({
      where: { id },
      data,
      include: { business: true, host: true },
    });
  }

  async rsvpEvent(churchId: string, eventId: string, memberId: string, status = 'GOING') {
    const event = await this.prisma.konnectNetworkingEvent.findFirst({ where: { id: eventId, churchId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.maxAttendees) {
      const count = await this.prisma.konnectEventRsvp.count({
        where: { eventId, status: 'GOING' },
      });
      if (count >= event.maxAttendees && status === 'GOING') {
        throw new BadRequestException('Event is at capacity');
      }
    }
    return this.prisma.konnectEventRsvp.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      create: { eventId, memberId, status },
      update: { status },
    });
  }

  listMentorships(churchId: string, status?: MentorshipStatus) {
    return this.prisma.mentorshipLink.findMany({
      where: { churchId, ...(status ? { status } : {}) },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            businessProfile: { select: { businessName: true, category: true } },
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            businessProfile: { select: { businessName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createMentorship(
    churchId: string,
    data: { mentorMemberId: string; menteeMemberId: string; focusArea?: string; goals?: string },
  ) {
    if (data.mentorMemberId === data.menteeMemberId) {
      throw new BadRequestException('Mentor and mentee must be different members');
    }
    const [mentor, mentee] = await Promise.all([
      this.prisma.member.findFirst({ where: { id: data.mentorMemberId, churchId } }),
      this.prisma.member.findFirst({ where: { id: data.menteeMemberId, churchId } }),
    ]);
    if (!mentor || !mentee) throw new NotFoundException('Member not found');
    return this.prisma.mentorshipLink.create({
      data: {
        churchId,
        mentorMemberId: data.mentorMemberId,
        menteeMemberId: data.menteeMemberId,
        focusArea: data.focusArea,
        goals: data.goals,
        status: 'REQUESTED',
      },
      include: {
        mentor: { select: { firstName: true, lastName: true } },
        mentee: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async updateMentorship(churchId: string, id: string, data: { status?: MentorshipStatus; notes?: string }) {
    const link = await this.prisma.mentorshipLink.findFirst({ where: { id, churchId } });
    if (!link) throw new NotFoundException('Mentorship not found');
    const update: Prisma.MentorshipLinkUpdateInput = { notes: data.notes };
    if (data.status) {
      update.status = data.status;
      if (data.status === 'ACTIVE') update.startedAt = new Date();
      if (data.status === 'COMPLETED') update.completedAt = new Date();
    }
    return this.prisma.mentorshipLink.update({
      where: { id },
      data: update,
      include: {
        mentor: { select: { firstName: true, lastName: true } },
        mentee: { select: { firstName: true, lastName: true } },
      },
    });
  }

  listMembersForKonnect(churchId: string) {
    return this.prisma.member.findMany({
      where: { churchId, roles: { has: 'ADULT' } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        businessProfile: { select: { id: true, businessName: true, verificationStatus: true } },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  private async memberForUser(churchId: string, userId: string) {
    return this.ensureMemberForUser(churchId, userId);
  }

  /** Links or creates a member row so mentorship forms work for any signed-in user. */
  private async ensureMemberForUser(churchId: string, userId: string) {
    let member = await this.prisma.member.findFirst({ where: { churchId, userId } });
    if (member) return member;

    const user = await this.prisma.user.findFirst({ where: { id: userId, churchId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.email) {
      const byEmail = await this.prisma.member.findFirst({
        where: { churchId, email: user.email },
      });
      if (byEmail) {
        return this.prisma.member.update({
          where: { id: byEmail.id },
          data: { userId: byEmail.userId ?? userId },
        });
      }
    }

    return this.prisma.member.create({
      data: {
        churchId,
        userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        status: 'ACTIVE_MEMBER',
        roles: ['ADULT'],
      },
    });
  }

  private async userIsStaff(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const names = userRoles.map((ur) => ur.role.name);
    return names.includes('ADMIN') || names.includes('PASTOR') || names.includes('LEADER');
  }

  listIdeas(churchId: string) {
    return this.prisma.hubIdea.findMany({
      where: { churchId },
      include: {
        member: { select: { firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createIdea(
    churchId: string,
    userId: string,
    data: { title: string; description: string; category?: string },
  ) {
    const member = await this.memberForUser(churchId, userId);
    return this.prisma.hubIdea.create({
      data: {
        churchId,
        memberId: member.id,
        title: data.title,
        description: data.description,
        category: data.category,
      },
      include: {
        member: { select: { firstName: true, lastName: true } },
        messages: { include: { author: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async addIdeaMessage(churchId: string, userId: string, ideaId: string, body: string) {
    const isStaff = await this.userIsStaff(userId);
    const idea = await this.prisma.hubIdea.findFirst({ where: { id: ideaId, churchId } });
    if (!idea) throw new NotFoundException('Idea not found');

    const member = await this.memberForUser(churchId, userId);
    const message = await this.prisma.hubIdeaMessage.create({
      data: { ideaId, authorId: member.id, body, isStaff },
      include: { author: { select: { firstName: true, lastName: true } } },
    });

    if (idea.status === 'SUBMITTED' && isStaff) {
      await this.prisma.hubIdea.update({ where: { id: ideaId }, data: { status: 'ADVISING' } });
    }
    await this.prisma.hubIdea.update({ where: { id: ideaId }, data: { updatedAt: new Date() } });
    return message;
  }

  updateIdeaStatus(churchId: string, ideaId: string, status: IdeaStatus) {
    return this.prisma.hubIdea.updateMany({ where: { id: ideaId, churchId }, data: { status } });
  }

  async submitMentorApplication(
    churchId: string,
    userId: string,
    data: {
      specialty: string;
      missionStatement: string;
      yearsExperience?: string;
      availability?: string;
      whyMentor?: string;
      background?: string;
    },
  ) {
    const member = await this.memberForUser(churchId, userId);
    const specialty = data.specialty?.trim();
    const missionStatement = data.missionStatement?.trim();
    if (!specialty || !missionStatement) {
      throw new BadRequestException('Specialty and mission statement are required');
    }

    const pending = await this.prisma.mentorApplication.findFirst({
      where: { churchId, memberId: member.id, status: 'PENDING' },
    });
    if (pending) throw new BadRequestException('You already have a pending mentor application');

    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');

    const questionnaire = {
      yearsExperience: data.yearsExperience?.trim(),
      availability: data.availability?.trim(),
      whyMentor: data.whyMentor?.trim(),
      background: data.background?.trim(),
    };

    const application = await this.prisma.mentorApplication.create({
      data: {
        churchId,
        memberId: member.id,
        specialty,
        missionStatement,
        questionnaire,
      },
    });

    await this.notifyAdminAndPastor({
      churchId,
      title: 'New mentor application',
      body: `A member applied to mentor in "${specialty}". Review in Kingdom Konnect → Mentorship.`,
      emailSubject: `[${church.name}] Mentor application pending`,
      emailBody: `Specialty: ${specialty}\n\nMission:\n${missionStatement}\n\nReview and approve in the dashboard.`,
      notificationType: 'MENTOR_APPLICATION_SUBMITTED',
      data: { applicationId: application.id } as Prisma.InputJsonValue,
    });

    return application;
  }

  async listMentorsManage(churchId: string, userId: string) {
    await this.requireAdmin(churchId, userId);

    const [applications, links] = await Promise.all([
      this.prisma.mentorApplication.findMany({
        where: { churchId },
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          mentorProfile: { select: { id: true, isActive: true } },
        },
      }),
      this.prisma.mentorshipLink.findMany({
        where: { churchId },
        include: {
          mentee: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    const menteesByMentor = new Map<string, typeof links>();
    for (const link of links) {
      const list = menteesByMentor.get(link.mentorMemberId) ?? [];
      list.push(link);
      menteesByMentor.set(link.mentorMemberId, list);
    }

    return applications.map((app) => ({
      id: app.id,
      memberId: app.memberId,
      memberName: `${app.member.firstName} ${app.member.lastName}`,
      memberEmail: app.member.email,
      specialty: app.specialty,
      missionStatement: app.missionStatement,
      questionnaire: app.questionnaire,
      status: app.status,
      statusLabel:
        app.status === 'APPROVED' ? 'Approved' : app.status === 'REJECTED' ? 'Declined' : 'Pending',
      createdAt: app.createdAt,
      approvedAt: app.approvedAt,
      rejectedAt: app.rejectedAt,
      rejectionNote: app.rejectionNote,
      mentorProfileId: app.mentorProfile?.id ?? null,
      mentees: (menteesByMentor.get(app.memberId) ?? []).map((l) => ({
        id: l.id,
        name: `${l.mentee.firstName} ${l.mentee.lastName}`,
        status: l.status,
        goals: l.goals,
        focusArea: l.focusArea,
      })),
    }));
  }

  listMentorApplicationsAdmin(churchId: string, userId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.requireAdmin(churchId, userId).then(() =>
      this.prisma.mentorApplication.findMany({
        where: { churchId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    );
  }

  async approveMentorApplication(churchId: string, userId: string, applicationId: string) {
    await this.requireAdmin(churchId, userId);
    const app = await this.prisma.mentorApplication.findFirst({
      where: { id: applicationId, churchId },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status === 'APPROVED') return app;

    const approvedAt = new Date();
    await this.prisma.mentorApplication.update({
      where: { id: applicationId },
      data: { status: 'APPROVED', approvedAt, approvedById: userId, rejectedAt: null, rejectionNote: null },
    });

    const existingProfile = await this.prisma.konnectMentorProfile.findUnique({
      where: { memberId: app.memberId },
    });
    if (!existingProfile) {
      await this.prisma.konnectMentorProfile.create({
        data: {
          churchId,
          memberId: app.memberId,
          applicationId,
          specialty: app.specialty,
          missionStatement: app.missionStatement,
          isActive: true,
        },
      });
    } else {
      await this.prisma.konnectMentorProfile.update({
        where: { id: existingProfile.id },
        data: {
          applicationId,
          specialty: app.specialty,
          missionStatement: app.missionStatement,
          isActive: true,
        },
      });
    }

    return this.prisma.mentorApplication.findUnique({
      where: { id: applicationId },
      include: { member: { select: { firstName: true, lastName: true, email: true } } },
    });
  }

  async rejectMentorApplication(churchId: string, userId: string, applicationId: string, note?: string) {
    await this.requireAdmin(churchId, userId);
    const app = await this.prisma.mentorApplication.findFirst({ where: { id: applicationId, churchId } });
    if (!app) throw new NotFoundException('Application not found');
    return this.prisma.mentorApplication.update({
      where: { id: applicationId },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectionNote: note?.trim() || undefined },
    });
  }

  async createMentorByAdmin(
    churchId: string,
    userId: string,
    data: { memberId: string; specialty: string; missionStatement: string },
  ) {
    await this.requireAdmin(churchId, userId);
    const member = await this.prisma.member.findFirst({ where: { id: data.memberId, churchId } });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.konnectMentorProfile.upsert({
      where: { memberId: member.id },
      create: {
        churchId,
        memberId: member.id,
        specialty: data.specialty.trim(),
        missionStatement: data.missionStatement.trim(),
        isActive: true,
      },
      update: {
        specialty: data.specialty.trim(),
        missionStatement: data.missionStatement.trim(),
        isActive: true,
      },
    });
  }

  listPublicMentors(churchId: string) {
    return this.prisma.konnectMentorProfile.findMany({
      where: { churchId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        specialty: true,
        missionStatement: true,
        createdAt: true,
      },
    });
  }

  async submitMenteeRequest(
    churchId: string,
    userId: string,
    data: { requestedMentorType: string; goals: string },
  ) {
    const member = await this.memberForUser(churchId, userId);
    const requestedMentorType = data.requestedMentorType?.trim();
    const goals = data.goals?.trim();
    if (!requestedMentorType || !goals) {
      throw new BadRequestException('Mentor type and goals are required');
    }

    return this.prisma.menteeMentorRequest.create({
      data: { churchId, memberId: member.id, requestedMentorType, goals },
    });
  }

  async listPublicMenteeRequests(churchId: string) {
    const rows = await this.prisma.menteeMentorRequest.findMany({
      where: { churchId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { member: { select: { firstName: true, lastName: true } } },
    });

    return rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      requestedMentorType: row.requestedMentorType,
      goals: row.goals,
      createdAt: row.createdAt,
      memberLabel: this.maskMemberName(row.member.firstName, row.member.lastName),
    }));
  }

  async requestMentorConnection(churchId: string, userId: string, mentorProfileId: string, goals?: string) {
    const mentee = await this.memberForUser(churchId, userId);
    const profile = await this.prisma.konnectMentorProfile.findFirst({
      where: { id: mentorProfileId, churchId, isActive: true },
    });
    if (!profile) throw new NotFoundException('Mentor not found');
    if (profile.memberId === mentee.id) {
      throw new BadRequestException('You cannot request mentorship with yourself');
    }

    return this.prisma.mentorshipLink.upsert({
      where: {
        mentorMemberId_menteeMemberId: {
          mentorMemberId: profile.memberId,
          menteeMemberId: mentee.id,
        },
      },
      create: {
        churchId,
        mentorMemberId: profile.memberId,
        menteeMemberId: mentee.id,
        focusArea: profile.specialty,
        goals: goals?.trim() || undefined,
        status: 'REQUESTED',
      },
      update: {
        focusArea: profile.specialty,
        goals: goals?.trim() || undefined,
        status: 'REQUESTED',
      },
      include: {
        mentor: { select: { firstName: true, lastName: true } },
        mentee: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
