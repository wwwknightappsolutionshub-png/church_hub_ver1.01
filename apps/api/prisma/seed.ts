import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createDefaultChurchLanding, mergeTenantModulesIntoSettings } from '@church-hub/shared-types';
import { SERVICE_UNIT_CATALOG } from './service-unit-catalog';
import {
  BRANDED_ANNIVERSARY_BODY,
  BRANDED_BIRTHDAY_BODY,
} from './celebration-email-seed-templates';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Church administrator',
      permissions: { create: [{ resource: '*', action: '*' }] },
    },
  });

  await prisma.role.upsert({
    where: { name: 'PASTOR' },
    update: {},
    create: {
      name: 'PASTOR',
      description: 'Pastoral staff',
      permissions: {
        create: [
          { resource: 'follow-up', action: 'read' },
          { resource: 'follow-up', action: 'write' },
          { resource: 'membership', action: 'read' },
        ],
      },
    },
  });

  await prisma.role.upsert({
    where: { name: 'LEADER' },
    update: {},
    create: {
      name: 'LEADER',
      description: 'Ministry leader',
      permissions: {
        create: [
          { resource: 'follow-up', action: 'read' },
          { resource: 'follow-up', action: 'write' },
          { resource: 'membership', action: 'read' },
        ],
      },
    },
  });

  await prisma.role.upsert({
    where: { name: 'YOUTH_ADMIN' },
    update: {},
    create: {
      name: 'YOUTH_ADMIN',
      description: 'Youth Hub administrator — full CRUD on youth modules',
      permissions: {
        create: [
          { resource: 'youth', action: 'read' },
          { resource: 'youth', action: 'write' },
          { resource: 'youth', action: 'moderate' },
        ],
      },
    },
  });

  await prisma.role.upsert({
    where: { name: 'DRIVER' },
    update: {},
    create: {
      name: 'DRIVER',
      description: 'Bus driver',
      permissions: {
        create: [{ resource: 'bus', action: 'write' }],
      },
    },
  });

  const memberRole = await prisma.role.upsert({
    where: { name: 'MEMBER' },
    update: {},
    create: {
      name: 'MEMBER',
      description: 'Church member',
      permissions: {
        create: [
          { resource: 'membership', action: 'read' },
          { resource: 'prayer-hub', action: 'read' },
          { resource: 'praise-hub', action: 'read' },
        ],
      },
    },
  });

  const passwordHash = await bcrypt.hash('ChurchHub123!', 12);

  const church = await prisma.church.upsert({
    where: { slug: 'demo-church' },
    update: {},
    create: {
      name: 'Demo Community Church',
      slug: 'demo-church',
      city: 'Springfield',
      country: 'US',
      settings: {
        landing: createDefaultChurchLanding('Demo Community Church', 'classic'),
      },
      users: {
        create: {
          email: 'admin@demo.church',
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          roles: { create: { roleId: adminRole.id } },
        },
      },
    },
    include: { users: true },
  });

  const adminUser = church.users[0];

  let member = await prisma.member.findFirst({
    where: { churchId: church.id, userId: adminUser.id },
  });
  if (!member) {
    member = await prisma.member.create({
      data: {
        churchId: church.id,
        userId: adminUser.id,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@demo.church',
        status: 'ACTIVE_MEMBER',
        roles: ['ADMIN', 'LEADER'],
        gamification: { create: {} },
      },
    });
  }

  await prisma.badge.createMany({
    data: [
      { name: 'First Visit', description: 'Attended first service', pointsRequired: 10 },
      { name: 'Faithful', description: '4-week attendance streak', pointsRequired: 100 },
    ],
    skipDuplicates: true,
  });

  await prisma.bus.create({
    data: { churchId: church.id, name: 'Bus 1', capacity: 40, plateNumber: 'CH-001' },
  });

  type SeedMember = {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    status: 'VISITOR' | 'NEW_MEMBER' | 'ACTIVE_MEMBER' | 'DISCIPLED';
    roles: ('YOUTH' | 'ADULT' | 'LEADER' | 'DRIVER' | 'EVANGELIST' | 'ADMIN')[];
    ministryInterests?: string[];
    onboardingStep?: number;
    familyKey?: string;
    dateOfBirth?: Date;
    specialOccasion?: string;
    specialOccasionDate?: Date;
  };

  const membershipSeed: SeedMember[] = [
    { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@demo.church', phone: '+44 7700 901001', status: 'ACTIVE_MEMBER', roles: ['ADULT', 'LEADER'], ministryInterests: ['Choir & Worship', 'Follow-up & Discipleship'], familyKey: 'johnson', onboardingStep: 6, dateOfBirth: new Date('1985-06-20') },
    { firstName: 'Michael', lastName: 'Chen', email: 'michael@demo.church', phone: '+44 7700 901002', status: 'DISCIPLED', roles: ['ADULT', 'EVANGELIST'], ministryInterests: ['Evangelism & Outreach', 'Follow-up & Discipleship'], familyKey: 'chen', onboardingStep: 6, specialOccasion: 'Wedding Anniversary', specialOccasionDate: new Date('2015-06-25') },
    { firstName: 'Grace', lastName: 'Williams', email: 'grace@demo.church', status: 'ACTIVE_MEMBER', roles: ['ADULT', 'DRIVER'], ministryInterests: ['Transportation', 'Hospitality'], familyKey: 'williams', onboardingStep: 6, dateOfBirth: new Date('1988-06-12') },
    { firstName: 'David', lastName: 'Okonkwo', email: 'david@demo.church', status: 'NEW_MEMBER', roles: ['ADULT'], ministryInterests: ['Ushering'], onboardingStep: 6, dateOfBirth: new Date('1990-07-01') },
    { firstName: 'Emma', lastName: 'Johnson', email: 'emma.j@demo.church', status: 'ACTIVE_MEMBER', roles: ['YOUTH'], ministryInterests: ["Teens' Church", 'Choir & Worship'], familyKey: 'johnson', onboardingStep: 6, dateOfBirth: new Date('2010-06-15') },
    { firstName: 'Noah', lastName: 'Johnson', status: 'NEW_MEMBER', roles: ['YOUTH'], ministryInterests: ["Children's Church"], familyKey: 'johnson', onboardingStep: 4, dateOfBirth: new Date('2019-07-22') },
    { firstName: 'Lily', lastName: 'Chen', status: 'ACTIVE_MEMBER', roles: ['YOUTH'], ministryInterests: ["Children's Church"], familyKey: 'chen', onboardingStep: 6, dateOfBirth: new Date('2018-03-10') },
    { firstName: 'James', lastName: 'Adebayo', email: 'james.a@demo.church', status: 'VISITOR', roles: ['ADULT'], ministryInterests: [], onboardingStep: 2 },
    { firstName: 'Ruth', lastName: 'Mensah', email: 'ruth.m@demo.church', status: 'VISITOR', roles: ['ADULT'], ministryInterests: ['Prayer & Intercession'], onboardingStep: 1 },
    { firstName: 'Thomas', lastName: 'Williams', status: 'DISCIPLED', roles: ['ADULT', 'LEADER'], ministryInterests: ['Winning Foundation School', 'Follow-up & Discipleship'], familyKey: 'williams', onboardingStep: 6 },
    { firstName: 'Chloe', lastName: 'Williams', status: 'NEW_MEMBER', roles: ['YOUTH'], ministryInterests: ['Media & Production'], familyKey: 'williams', onboardingStep: 5 },
    { firstName: 'Pastor', lastName: 'Adeleke', email: 'pastor@demo.church', status: 'DISCIPLED', roles: ['ADULT', 'LEADER'], ministryInterests: ['Prayer & Intercession', 'Follow-up & Discipleship'], onboardingStep: 6 },
  ];

  const familyNames: Record<string, string> = {
    johnson: 'Johnson Family',
    chen: 'Chen Family',
    williams: 'Williams Family',
  };

  const familyByKey: Record<string, string> = {};
  for (const [key, name] of Object.entries(familyNames)) {
    let fam = await prisma.family.findFirst({ where: { churchId: church.id, name } });
    if (!fam) {
      fam = await prisma.family.create({ data: { churchId: church.id, name } });
    }
    familyByKey[key] = fam.id;
  }

  const extraMembers: Awaited<ReturnType<typeof prisma.member.create>>[] = [];
  const memberByEmail: Record<string, typeof member> = { [member.email ?? 'admin']: member };

  for (const m of membershipSeed) {
    const existing = m.email
      ? await prisma.member.findFirst({ where: { churchId: church.id, email: m.email } })
      : await prisma.member.findFirst({
          where: { churchId: church.id, firstName: m.firstName, lastName: m.lastName },
        });

    const familyId = m.familyKey ? familyByKey[m.familyKey] : undefined;
    const data = {
      churchId: church.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      status: m.status,
      roles: m.roles,
      ministryInterests: m.ministryInterests ?? [],
      onboardingStep: m.onboardingStep ?? 0,
      familyId,
      dateOfBirth: m.dateOfBirth,
      specialOccasion: m.specialOccasion,
      specialOccasionDate: m.specialOccasionDate,
      gamification: { create: {} },
    };

    const record = existing
      ? await prisma.member.update({
          where: { id: existing.id },
          data: {
            status: m.status,
            roles: m.roles,
            ministryInterests: m.ministryInterests ?? [],
            onboardingStep: m.onboardingStep ?? existing.onboardingStep,
            familyId: familyId ?? existing.familyId,
            phone: m.phone,
            dateOfBirth: m.dateOfBirth ?? existing.dateOfBirth,
            specialOccasion: m.specialOccasion ?? existing.specialOccasion,
            specialOccasionDate: m.specialOccasionDate ?? existing.specialOccasionDate,
          },
        })
      : await prisma.member.create({ data });

    extraMembers.push(record);
    if (m.email) memberByEmail[m.email] = record;
  }

  await prisma.family.update({
    where: { id: familyByKey.johnson },
    data: { headMemberId: memberByEmail['sarah@demo.church']?.id },
  });
  await prisma.family.update({
    where: { id: familyByKey.chen },
    data: { headMemberId: memberByEmail['michael@demo.church']?.id },
  });
  await prisma.family.update({
    where: { id: familyByKey.williams },
    data: { headMemberId: extraMembers.find((x) => x.firstName === 'Grace')?.id },
  });

  await prisma.family.update({
    where: { id: familyByKey.johnson },
    data: {
      address: '10 Downing Street',
      city: 'London',
      zip: 'SW1A 2AA',
      country: 'United Kingdom',
      specialOccasion: 'Wedding Anniversary',
      specialOccasionDate: new Date('2010-06-18'),
      email: 'johnson.family@demo.church',
    },
  });
  await prisma.family.update({
    where: { id: familyByKey.chen },
    data: {
      address: '1 Piccadilly Gardens',
      city: 'Manchester',
      zip: 'M1 1RG',
      country: 'United Kingdom',
      email: 'chen.family@demo.church',
    },
  });
  await prisma.family.update({
    where: { id: familyByKey.williams },
    data: {
      address: '1 Centenary Square',
      city: 'Birmingham',
      zip: 'B1 1BB',
      country: 'United Kingdom',
      specialOccasion: 'Wedding Anniversary',
      specialOccasionDate: new Date('2005-07-05'),
      email: 'williams.family@demo.church',
    },
  });

  for (const kind of ['BIRTHDAY', 'ANNIVERSARY'] as const) {
    const subject =
      kind === 'BIRTHDAY'
        ? 'Happy Birthday, {{firstName}}! — {{churchName}}'
        : 'Celebrating {{occasionName}} with you — {{churchName}}';
    const bodyHtml = kind === 'BIRTHDAY' ? BRANDED_BIRTHDAY_BODY : BRANDED_ANNIVERSARY_BODY;
    await prisma.celebrationEmailTemplate.upsert({
      where: { churchId_kind: { churchId: church.id, kind } },
      update: { subject, bodyHtml, isActive: true, autoSend: true },
      create: { churchId: church.id, kind, subject, bodyHtml, isActive: true, autoSend: true },
    });
  }

  const linkGuardian = async (parentEmail: string, childFirst: string, childLast: string) => {
    const parent = memberByEmail[parentEmail] ?? extraMembers.find((x) => x.email === parentEmail);
    const child = extraMembers.find((x) => x.firstName === childFirst && x.lastName === childLast);
    if (!parent || !child) return;
    await prisma.parentGuardianLink.upsert({
      where: { parentId_childId: { parentId: parent.id, childId: child.id } },
      create: { parentId: parent.id, childId: child.id, relation: 'PARENT' },
      update: {},
    });
  };

  await linkGuardian('sarah@demo.church', 'Emma', 'Johnson');
  await linkGuardian('sarah@demo.church', 'Noah', 'Johnson');
  await linkGuardian('michael@demo.church', 'Lily', 'Chen');
  const grace = extraMembers.find((x) => x.firstName === 'Grace');
  const chloe = extraMembers.find((x) => x.firstName === 'Chloe');
  if (grace && chloe) {
    await prisma.parentGuardianLink.upsert({
      where: { parentId_childId: { parentId: grace.id, childId: chloe.id } },
      create: { parentId: grace.id, childId: chloe.id, relation: 'PARENT' },
      update: {},
    });
  }

  const catalogNames = new Set(SERVICE_UNIT_CATALOG.map((u) => u.name));
  await prisma.serviceUnit.updateMany({
    where: { churchId: church.id, name: { notIn: [...catalogNames] } },
    data: { isActive: false },
  });

  const units = SERVICE_UNIT_CATALOG.map((u) => ({ ...u }));

  for (const [i, u] of units.entries()) {
    let unit = await prisma.serviceUnit.findFirst({
      where: { churchId: church.id, name: u.name },
    });
    if (!unit) {
      unit = await prisma.serviceUnit.create({
        data: {
          churchId: church.id,
          name: u.name,
          description: u.description,
          activities: u.activities,
        },
      });
    } else {
      unit = await prisma.serviceUnit.update({
        where: { id: unit.id },
        data: {
          description: u.description,
          activities: u.activities,
          isActive: true,
        },
      });
    }

    const existingLeader = await prisma.serviceUnitLeader.findFirst({
      where: { serviceUnitId: unit.id, memberId: member.id },
    });
    const unitAdminNames = new Set([
      'Follow-up',
      'Harvesters Squad',
      'Prayer Squad',
      'Winning Foundation School',
      "Children's Church Teachers",
    ]);
    if (!existingLeader) {
      await prisma.serviceUnitLeader.create({
        data: {
          serviceUnitId: unit.id,
          memberId: member.id,
          role: unitAdminNames.has(u.name) ? 'UNIT ADMIN' : 'LEADER',
          isModerator: true,
          isUnitAdmin: unitAdminNames.has(u.name) || i === 0,
        },
      });
    } else if (unitAdminNames.has(u.name)) {
      await prisma.serviceUnitLeader.update({
        where: { id: existingLeader.id },
        data: { isUnitAdmin: true, role: 'UNIT ADMIN' },
      });
    }

    const memberIds = [member.id, extraMembers[i % extraMembers.length]?.id].filter(Boolean) as string[];
    for (const mid of memberIds) {
      const exists = await prisma.serviceUnitMember.findFirst({
        where: { serviceUnitId: unit.id, memberId: mid },
      });
      if (!exists) {
        await prisma.serviceUnitMember.create({ data: { serviceUnitId: unit.id, memberId: mid } });
      }
    }

    const meetingExists = await prisma.serviceUnitMeeting.findFirst({
      where: { serviceUnitId: unit.id, title: `${u.name} Weekly Meeting` },
    });
    if (!meetingExists) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7 + i);
      await prisma.serviceUnitMeeting.create({
        data: {
          churchId: church.id,
          serviceUnitId: unit.id,
          title: `${u.name} Weekly Meeting`,
          location: 'Fellowship Hall',
          startsAt: nextWeek,
          description: 'Regular team sync and planning session.',
        },
      });
    }

    const postExists = await prisma.serviceUnitPost.findFirst({
      where: { serviceUnitId: unit.id, title: `Welcome to ${u.name}` },
    });
    if (!postExists) {
      await prisma.serviceUnitPost.create({
        data: {
          serviceUnitId: unit.id,
          authorId: member.id,
          title: `Welcome to ${u.name}`,
          body: 'Use this board for updates, questions, and coordination. Leaders will moderate discussions.',
          isPinned: true,
        },
      });
    }
  }

  const childrenUnit = await prisma.serviceUnit.findFirst({
    where: { churchId: church.id, name: "Children's Church Teachers" },
  });
  const lilyChild = extraMembers.find((x) => x.firstName === 'Lily' && x.lastName === 'Chen');
  const noahChild = extraMembers.find((x) => x.firstName === 'Noah' && x.lastName === 'Johnson');
  if (childrenUnit && lilyChild) {
    await prisma.deptChildrenClassEnrollment.upsert({
      where: {
        serviceUnitId_childMemberId: { serviceUnitId: childrenUnit.id, childMemberId: lilyChild.id },
      },
      create: {
        churchId: church.id,
        serviceUnitId: childrenUnit.id,
        childMemberId: lilyChild.id,
        classGroup: 'AGES_6_9',
      },
      update: { classGroup: 'AGES_6_9' },
    });
  }
  if (childrenUnit && noahChild) {
    await prisma.deptChildrenClassEnrollment.upsert({
      where: {
        serviceUnitId_childMemberId: { serviceUnitId: childrenUnit.id, childMemberId: noahChild.id },
      },
      create: {
        churchId: church.id,
        serviceUnitId: childrenUnit.id,
        childMemberId: noahChild.id,
        classGroup: 'AGES_6_9',
      },
      update: { classGroup: 'AGES_6_9' },
    });
  }

  const followUpSamples = [
    { contactName: 'James Adeyemi', contactPhone: '+44 7700 900111', stage: 'NEW_LEAD' as const, notes: 'First-time visitor — interested in WSF.', daysDue: 1 },
    { contactName: 'Emily Thompson', contactPhone: '+44 7700 900222', contactEmail: 'emily.t@example.com', stage: 'CONTACTED' as const, daysDue: 2 },
    { contactName: 'Daniel Okoro', contactPhone: '+44 7700 900333', stage: 'VISITED' as const, notes: 'Home visit completed.', daysDue: -1 },
    { contactName: 'Priya Sharma', contactEmail: 'priya.s@example.com', stage: 'ATTENDED' as const, daysDue: 3 },
    { contactName: 'Marcus Lee', contactPhone: '+44 7700 900555', stage: 'JOINED_GROUP' as const, notes: 'Joined Dartford cell group.' },
    { contactName: 'Hannah Brooks', contactPhone: '+44 7700 900666', stage: 'NEW_LEAD' as const, notes: 'Met at outreach stall.', daysDue: 0 },
    { contactName: 'Samuel Okafor', contactPhone: '+44 7700 900777', contactEmail: 'samuel.o@example.com', stage: 'CONTACTED' as const, daysDue: 4 },
    { contactName: 'Fatima Ali', contactPhone: '+44 7700 900888', stage: 'VISITED' as const, daysDue: 2 },
  ];

  const createdFollowUps: Awaited<ReturnType<typeof prisma.followUp.create>>[] = [];

  for (const sample of followUpSamples) {
    let fu = await prisma.followUp.findFirst({
      where: { churchId: church.id, contactName: sample.contactName },
    });

    const dueAt = sample.daysDue !== undefined ? new Date() : undefined;
    if (dueAt && sample.daysDue !== undefined) {
      dueAt.setDate(dueAt.getDate() + sample.daysDue);
    }

    if (!fu) {
      fu = await prisma.followUp.create({
        data: {
          churchId: church.id,
          contactName: sample.contactName,
          contactPhone: sample.contactPhone,
          contactEmail: sample.contactEmail,
          stage: sample.stage,
          notes: sample.notes,
          assignedToId: adminUser.id,
          dueAt: sample.stage === 'JOINED_GROUP' ? undefined : dueAt,
          completedAt: sample.stage === 'JOINED_GROUP' ? new Date() : undefined,
        },
      });
    }

    createdFollowUps.push(fu);

    if (dueAt && sample.stage !== 'JOINED_GROUP') {
      const hasReminder = await prisma.followUpReminder.findFirst({
        where: { followUpId: fu.id },
      });
      if (!hasReminder) {
        await prisma.followUpReminder.create({
          data: {
            followUpId: fu.id,
            remindAt: dueAt,
            channel: sample.contactPhone ? 'SMS' : 'EMAIL',
            message: `Follow-up reminder: ${sample.contactName}`,
          },
        });
      }
    }
  }

  for (const tpl of [
    { name: 'Welcome SMS', channel: 'SMS', body: 'Hi {{name}}, thank you for visiting {{church}}! We would love to stay connected.' },
    { name: 'WhatsApp check-in', channel: 'WHATSAPP', body: 'Hello {{name}} 🙏 This is {{church}} follow-up team. How are you this week?' },
    { name: 'Visit email', channel: 'EMAIL', subject: 'We would love to visit you', body: 'Dear {{name}},\n\nA member of our team would like to visit you.\n\nBlessings,\n{{church}}' },
  ]) {
    const exists = await prisma.followUpTemplate.findFirst({
      where: { churchId: church.id, name: tpl.name },
    });
    if (!exists) {
      await prisma.followUpTemplate.create({
        data: { churchId: church.id, ...tpl },
      });
    }
  }

  const michaelMember = memberByEmail['michael@demo.church'];
  if (michaelMember) {
    const qrExists = await prisma.evangelistQrCode.findFirst({
      where: { churchId: church.id, memberId: michaelMember.id },
    });
    if (!qrExists) {
      const code = 'demo-evangelist-qr';
      await prisma.evangelistQrCode.create({
        data: {
          churchId: church.id,
          memberId: michaelMember.id,
          code,
          nfcUrl: 'http://localhost:3001/outreach/capture?code=demo-evangelist-qr',
          scanCount: 12,
        },
      });
    }
  }

  const outreachCaptures = [
    { firstName: 'Aisha', lastName: 'Bello', phone: '+44 7700 902001', stage: 'field', locationLabel: 'Dartford town centre', evangelistEmail: 'michael@demo.church' },
    { firstName: 'Connor', lastName: 'Reid', phone: '+44 7700 902002', email: 'connor@example.com', locationLabel: 'Bluewater outreach', evangelistEmail: 'michael@demo.church', welcome: true },
    { firstName: 'Yuki', lastName: 'Tanaka', phone: '+44 7700 902003', latitude: 51.4472, longitude: 0.2197, photoConsent: true, evangelistEmail: 'sarah@demo.church' },
  ];

  for (const cap of outreachCaptures) {
    const exists = await prisma.outreachContact.findFirst({
      where: { churchId: church.id, firstName: cap.firstName, lastName: cap.lastName },
    });
    if (exists) continue;
    const ev = cap.evangelistEmail ? memberByEmail[cap.evangelistEmail] : undefined;
    await prisma.outreachContact.create({
      data: {
        churchId: church.id,
        firstName: cap.firstName,
        lastName: cap.lastName,
        phone: cap.phone,
        email: cap.email,
        evangelistId: ev?.id,
        locationLabel: cap.locationLabel,
        latitude: cap.latitude,
        longitude: cap.longitude,
        photoConsent: cap.photoConsent ?? false,
        welcomeSentAt: cap.welcome ? new Date() : undefined,
        notes: cap.stage === 'field' ? 'Met at street outreach — interested in Sunday service' : undefined,
      },
    });
  }

  const jamesFu = createdFollowUps.find((f) => f.contactName === 'James Adeyemi');
  const danielFu = createdFollowUps.find((f) => f.contactName === 'Daniel Okoro');
  if (jamesFu && !(await prisma.pastoralNote.findFirst({ where: { followUpId: jamesFu.id } }))) {
    await prisma.pastoralNote.create({
      data: {
        churchId: church.id,
        followUpId: jamesFu.id,
        authorId: adminUser.id,
        content: 'Very receptive — schedule WSF introduction next call.',
        isConfidential: false,
      },
    });
  }
  if (danielFu && !(await prisma.pastoralNote.findFirst({ where: { followUpId: danielFu.id } }))) {
    await prisma.pastoralNote.create({
      data: {
        churchId: church.id,
        followUpId: danielFu.id,
        authorId: adminUser.id,
        content: 'Sensitive family situation — handle home visit with care.',
        isConfidential: true,
      },
    });
  }

  const demoSermons = [
    {
      title: 'The Blessing of Obedience',
      speaker: 'Pastor David Mensah',
      seriesName: 'Exodus Series',
      description: 'Exploring Exodus 23:25 and the promise tied to serving the Lord.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      durationSec: 348,
      preachedAt: new Date('2026-05-18'),
    },
    {
      title: 'Walking in Faith',
      speaker: 'Pastor Sarah Johnson',
      seriesName: 'Faith Foundations',
      description: 'Practical steps to trust God in uncertain seasons.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      durationSec: 420,
      preachedAt: new Date('2026-05-11'),
    },
    {
      title: 'Kingdom Mindset for Business',
      speaker: 'Elder Michael Chen',
      seriesName: 'Kingdom Connect',
      description: 'Stewardship, integrity, and purpose in marketplace calling.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      durationSec: 390,
      preachedAt: new Date('2026-05-04'),
    },
    {
      title: 'The Power of Prayer',
      speaker: 'Prayer Squad Lead',
      seriesName: 'Prayer & Intercession',
      description: 'Building a consistent prayer life that moves mountains.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      durationSec: 360,
      preachedAt: new Date('2026-04-27'),
    },
    {
      title: 'Winning Souls, Winning Lives',
      speaker: 'Harvesters Coordinator',
      seriesName: 'Soul Winning',
      description: 'Evangelism with compassion and follow-through.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      durationSec: 405,
      preachedAt: new Date('2026-04-20'),
    },
    {
      title: 'Sunday Celebration Recap',
      speaker: 'Choir & Worship',
      seriesName: 'Standalone',
      description: 'Highlights and exhortation from Sunday service.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      durationSec: 300,
      preachedAt: new Date('2026-04-13'),
    },
  ];

  for (const s of demoSermons) {
    const exists = await prisma.sermon.findFirst({
      where: { churchId: church.id, title: s.title },
    });
    if (!exists) {
      await prisma.sermon.create({
        data: { churchId: church.id, ...s },
      });
    }
  }

  const ideaSamples = [
    {
      title: 'Community catering cooperative',
      description:
        'A member-led catering service using church kitchen facilities for events, with profits funding youth programmes.',
      category: 'Business',
      status: 'ADVISING' as const,
      messages: [
        {
          body: 'Consider starting with a pilot at fellowship events and document food safety requirements.',
          isStaff: true,
        },
      ],
    },
    {
      title: 'Teens coding club',
      description: 'Weekly coding workshops pairing teens with IT volunteers to learn web basics and faith-based ethics.',
      category: 'Technology',
      status: 'IN_REVIEW' as const,
      messages: [
        {
          body: 'Great initiative — we can connect you with the IT service unit for mentors.',
          isStaff: true,
        },
      ],
    },
  ];

  for (const sample of ideaSamples) {
    const exists = await prisma.hubIdea.findFirst({
      where: { churchId: church.id, title: sample.title },
    });
    if (exists) continue;

    const idea = await prisma.hubIdea.create({
      data: {
        churchId: church.id,
        memberId: member.id,
        title: sample.title,
        description: sample.description,
        category: sample.category,
        status: sample.status,
      },
    });

    for (const msg of sample.messages) {
      await prisma.hubIdeaMessage.create({
        data: {
          ideaId: idea.id,
          authorId: member.id,
          body: msg.body,
          isStaff: msg.isStaff,
        },
      });
    }
  }

  // ─── Youth Community Platform ─────────────────────────────
  const youthBadges = [
    { name: 'First Event', description: 'Attended first youth event', pointsRequired: 25 },
    { name: 'Faithful Attender', description: '3-week attendance streak', pointsRequired: 75 },
    { name: 'Community Builder', description: 'Active in group chat', pointsRequired: 50 },
    { name: 'Help Hero', description: 'Supported a peer through Help Zone', pointsRequired: 100 },
  ];
  for (const b of youthBadges) {
    const exists = await prisma.badge.findFirst({ where: { name: b.name } });
    if (!exists) await prisma.badge.create({ data: b });
  }

  const youthByName = (first: string, last: string) =>
    extraMembers.find((x) => x.firstName === first && x.lastName === last);

  const emma = youthByName('Emma', 'Johnson');
  const noah = youthByName('Noah', 'Johnson');
  const lily = youthByName('Lily', 'Chen');
  const chloeW = youthByName('Chloe', 'Williams');

  const groupDefs = [
    { name: 'Teens Connect', description: 'Friday night fellowship for ages 13–17', minAge: 13, maxAge: 17 },
    { name: 'Ignite Young Adults', description: 'University & young professional hub', minAge: 18, maxAge: 25 },
    { name: 'Junior Church Crew', description: 'Sunday junior church discipleship', minAge: 8, maxAge: 12 },
  ];

  const youthGroups: Awaited<ReturnType<typeof prisma.youthGroup.create>>[] = [];
  for (const g of groupDefs) {
    let group = await prisma.youthGroup.findFirst({ where: { churchId: church.id, name: g.name } });
    if (!group) {
      group = await prisma.youthGroup.create({
        data: { churchId: church.id, name: g.name, description: g.description, minAge: g.minAge, maxAge: g.maxAge },
      });
    }
    youthGroups.push(group);
  }

  const [teensGroup, igniteGroup, juniorGroup] = youthGroups;

  const addToGroup = async (groupId: string, memberId: string | undefined) => {
    if (!memberId) return;
    await prisma.youthGroupMember.upsert({
      where: { youthGroupId_memberId: { youthGroupId: groupId, memberId } },
      create: { youthGroupId: groupId, memberId },
      update: {},
    });
  };

  if (teensGroup) {
    await addToGroup(teensGroup.id, emma?.id);
    await addToGroup(teensGroup.id, noah?.id);
    await addToGroup(teensGroup.id, chloeW?.id);
  }
  if (igniteGroup && emma) await addToGroup(igniteGroup.id, emma.id);
  if (juniorGroup && lily) await addToGroup(juniorGroup.id, lily.id);

  for (const g of youthGroups) {
    const chExists = await prisma.chatChannel.findFirst({ where: { churchId: church.id, youthGroupId: g.id } });
    if (!chExists) {
      await prisma.chatChannel.create({
        data: {
          churchId: church.id,
          youthGroupId: g.id,
          channelType: 'YOUTH',
          name: `${g.name} Chat`,
          description: 'Moderated youth discussion — keyword filter enabled',
          isModerated: true,
        },
      });
    }
  }

  const teensChannel = await prisma.chatChannel.findFirst({
    where: { churchId: church.id, youthGroupId: teensGroup?.id },
  });
  if (teensChannel) {
    const msgCount = await prisma.message.count({ where: { channelId: teensChannel.id } });
    if (msgCount === 0) {
      await prisma.message.createMany({
        data: [
          { channelId: teensChannel.id, senderId: adminUser.id, content: 'Welcome to Teens Connect chat! Be kind and encouraging.' },
          { channelId: teensChannel.id, senderId: adminUser.id, content: 'Reminder: retreat RSVP closes Friday.' },
          {
            channelId: teensChannel.id,
            senderId: adminUser.id,
            content: 'Please no spam or hate speech here',
            isFlagged: true,
            flagReason: 'Flagged keyword: spam',
            isHidden: true,
          },
        ],
      });
    }
  }

  const eventDefs = [
    {
      title: 'Friday Night Alive',
      description: 'Worship, games, and small groups',
      location: 'Youth Hall',
      daysFromNow: 5,
      groupId: teensGroup?.id,
    },
    {
      title: 'Summer Retreat Sign-up',
      description: 'Deposit and permission forms due',
      location: 'Retreat Centre',
      daysFromNow: 21,
      groupId: teensGroup?.id,
    },
    {
      title: 'Ignite Social & Study',
      description: 'Coffee, accountability, and Bible study',
      location: 'Fellowship Cafe',
      daysFromNow: 10,
      groupId: igniteGroup?.id,
    },
    {
      title: 'Junior Church Awards Sunday',
      description: 'Celebrating attendance streaks and memory verses',
      location: 'Children Building',
      daysFromNow: 14,
      groupId: juniorGroup?.id,
    },
  ];

  for (const ev of eventDefs) {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + ev.daysFromNow);
    let event = await prisma.youthEvent.findFirst({ where: { churchId: church.id, title: ev.title } });
    if (!event) {
      event = await prisma.youthEvent.create({
        data: {
          churchId: church.id,
          youthGroupId: ev.groupId,
          title: ev.title,
          description: ev.description,
          location: ev.location,
          startsAt,
          maxAttendees: 60,
        },
      });
    }
    if (emma && ev.title === 'Friday Night Alive') {
      await prisma.youthEventRsvp.upsert({
        where: { eventId_memberId: { eventId: event.id, memberId: emma.id } },
        create: { eventId: event.id, memberId: emma.id, status: 'GOING' },
        update: { status: 'GOING' },
      });
      await prisma.youthAttendance.upsert({
        where: { eventId_memberId: { eventId: event.id, memberId: emma.id } },
        create: { eventId: event.id, memberId: emma.id },
        update: {},
      });
    }
    if (noah && ev.title === 'Friday Night Alive') {
      await prisma.youthEventRsvp.upsert({
        where: { eventId_memberId: { eventId: event.id, memberId: noah.id } },
        create: { eventId: event.id, memberId: noah.id, status: 'GOING' },
        update: {},
      });
    }
  }

  const feedPostDefs = [
    {
      authorId: emma?.id,
      youthGroupId: teensGroup?.id,
      content: 'Friday night was incredible — who is coming next week? #youth #worship',
      hashtags: ['youth', 'worship'],
      mediaUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    },
    {
      authorId: noah?.id,
      youthGroupId: teensGroup?.id,
      content: 'Small group homework: read John 15 this week. #faith',
      hashtags: ['faith'],
    },
    {
      authorId: chloeW?.id,
      youthGroupId: teensGroup?.id,
      content: 'Retreat signup is live — grab your permission slip Sunday!',
      hashtags: [],
    },
    {
      authorId: emma?.id,
      content: 'Please no spam or hate speech in our community',
      hashtags: [],
      flagged: true,
    },
  ];

  for (const fp of feedPostDefs) {
    if (!fp.authorId) continue;
    const exists = await prisma.youthPost.findFirst({
      where: { churchId: church.id, content: fp.content },
    });
    if (exists) continue;
    const post = await prisma.youthPost.create({
      data: {
        churchId: church.id,
        authorMemberId: fp.authorId,
        youthGroupId: fp.youthGroupId,
        content: fp.content,
        hashtags: fp.hashtags,
        status: fp.flagged ? 'FLAGGED' : 'PUBLISHED',
        engagementScore: fp.flagged ? 0 : 12,
        reactionCount: fp.flagged ? 0 : 2,
        commentCount: 0,
        media: fp.mediaUrl
          ? {
              create: {
                churchId: church.id,
                uploaderMemberId: fp.authorId,
                url: fp.mediaUrl,
                kind: 'IMAGE',
                sortOrder: 0,
              },
            }
          : undefined,
      },
    });
    if (!fp.flagged && emma && fp.authorId === emma.id) {
      const reactionRows = [
        noah && {
          churchId: church.id,
          memberId: noah.id,
          targetType: 'POST' as const,
          postId: post.id,
          reactionType: 'LIKE' as const,
        },
        chloeW && {
          churchId: church.id,
          memberId: chloeW.id,
          targetType: 'POST' as const,
          postId: post.id,
          reactionType: 'LOVE' as const,
        },
      ].filter(Boolean) as Array<{
        churchId: string;
        memberId: string;
        targetType: 'POST';
        postId: string;
        reactionType: 'LIKE' | 'LOVE';
      }>;
      if (reactionRows.length) {
        await prisma.youthReaction.createMany({ data: reactionRows, skipDuplicates: true });
      }
    }
    if (fp.flagged) {
      await prisma.youthContentReport.create({
        data: {
          churchId: church.id,
          reporterMemberId: fp.authorId,
          postId: post.id,
          reason: 'Flagged keyword: spam',
        },
      });
    }
  }

  const achievementDefs = [
    { key: 'first_rsvp', name: 'First RSVP', description: 'RSVP to your first youth event', pointsAward: 10, criteria: { source: 'RSVP', count: 1 } },
    { key: 'streak_3', name: '3-Week Streak', description: 'Attend events three weeks in a row', pointsAward: 25, criteria: { attendanceStreak: 3 } },
    { key: 'community_voice', name: 'Community Voice', description: 'Post or comment 10 times', pointsAward: 15, criteria: { feedActions: 10 } },
    { key: 'challenge_starter', name: 'Challenge Starter', description: 'Complete a youth challenge', pointsAward: 20, criteria: { challengesCompleted: 1 } },
  ];
  for (const a of achievementDefs) {
    await prisma.youthAchievement.upsert({
      where: { churchId_key: { churchId: church.id, key: a.key } },
      create: { churchId: church.id, ...a, criteria: a.criteria },
      update: {},
    });
  }

  const challengeDefs = [
    { title: 'Attend 2 events this month', description: 'Check in at two youth events', points: 50, challengeType: 'ATTENDANCE', targetCount: 2 },
    { title: 'RSVP to 3 events', description: 'Say you are going to three events', points: 30, challengeType: 'RSVP', targetCount: 3 },
    { title: 'Feed encourager', description: 'Leave 5 comments on posts', points: 20, challengeType: 'COMMENT', targetCount: 5 },
  ];
  for (const c of challengeDefs) {
    const exists = await prisma.youthChallenge.findFirst({ where: { churchId: church.id, title: c.title } });
    if (!exists) await prisma.youthChallenge.create({ data: { churchId: church.id, ...c } });
  }

  if (emma) {
    await prisma.memberGamification.upsert({
      where: { memberId: emma.id },
      create: { memberId: emma.id, points: 85, xp: 85, level: 2, attendanceStreak: 2 },
      update: { points: 85, xp: 85, level: 2, attendanceStreak: 2 },
    });
    await prisma.youthUserLevel.upsert({
      where: { memberId: emma.id },
      create: { memberId: emma.id, level: 2, xp: 85, xpToNextLevel: 115, tierTitle: 'Rising Star' },
      update: { level: 2, xp: 85, xpToNextLevel: 115, tierTitle: 'Rising Star' },
    });
  }

  const resourceDefs = [
    { title: 'Daily Devotional — Courage', category: 'DEVOTIONAL' as const, description: '5-minute reading for teens' },
    { title: 'Worship Playlist — Youth Night', category: 'WORSHIP' as const, url: 'https://example.com/youth-worship' },
    { title: 'Online Safety Guide', category: 'SAFETY' as const, content: 'Tips for safe social media and reporting concerns.' },
    { title: 'How to Share Your Faith', category: 'GUIDE' as const, description: 'Simple steps for school conversations' },
    { title: 'Retreat Recap Video', category: 'EVENT_RECAP' as const, url: 'https://example.com/retreat-recap' },
  ];

  for (const r of resourceDefs) {
    const exists = await prisma.youthResource.findFirst({ where: { churchId: church.id, title: r.title } });
    if (!exists) {
      await prisma.youthResource.create({
        data: {
          churchId: church.id,
          title: r.title,
          description: r.description,
          category: r.category,
          url: r.url,
          content: r.content,
          isPublished: true,
        },
      });
    }
  }

  const helpSamples = [
    {
      message: 'I feel anxious about exams and don’t know who to talk to.',
      category: 'MENTAL_HEALTH' as const,
      status: 'OPEN' as const,
      alias: 'Anonymous Owl',
    },
    {
      message: 'Someone at school is bullying me — I need advice.',
      category: 'BULLYING' as const,
      status: 'ASSIGNED' as const,
      alias: 'Anonymous Star',
    },
    {
      message: 'I have questions about baptism and what it means.',
      category: 'FAITH' as const,
      status: 'IN_PROGRESS' as const,
      alias: 'Seeker',
    },
  ];

  for (const h of helpSamples) {
    const exists = await prisma.youthHelpRequest.findFirst({
      where: { churchId: church.id, message: h.message },
    });
    if (!exists) {
      const req = await prisma.youthHelpRequest.create({
        data: {
          churchId: church.id,
          message: h.message,
          category: h.category,
          status: h.status,
          isAnonymous: true,
          alias: h.alias,
          assignedToId: h.status !== 'OPEN' ? adminUser.id : undefined,
        },
      });
      if (h.status === 'IN_PROGRESS') {
        await prisma.youthHelpResponse.create({
          data: {
            requestId: req.id,
            authorId: adminUser.id,
            body: 'Thank you for reaching out. A leader would love to meet you after service — no pressure.',
            isInternal: false,
          },
        });
      }
    }
  }

  const qaSamples = [
    {
      question: 'How do I know if God really hears my prayers when life feels quiet?',
      category: 'FAITH' as const,
      status: 'PUBLIC' as const,
      alias: 'Curious Sparrow',
      publicAnswer:
        'God hears every prayer. Silence is not absence — keep showing up in worship and small group; leaders are here to walk with you.',
      memberId: noah?.id,
    },
    {
      question: 'Is it okay to set boundaries with friends who pressure me?',
      category: 'RELATIONSHIPS' as const,
      status: 'ANSWERED' as const,
      alias: 'Anonymous',
      privateAnswer: 'Yes — healthy boundaries are biblical. Talk to a trusted leader if you need help wording a conversation.',
      memberId: emma?.id,
    },
    {
      question: 'Open queue sample: what should I do when I fail a test?',
      category: 'SCHOOL' as const,
      status: 'OPEN' as const,
      alias: 'Study Buddy',
      memberId: lily?.id,
    },
  ];

  for (const q of qaSamples) {
    const exists = await prisma.youthQuestion.findFirst({
      where: { churchId: church.id, question: q.question },
    });
    if (exists) continue;

    const row = await prisma.youthQuestion.create({
      data: {
        churchId: church.id,
        memberId: q.memberId ?? null,
        question: q.question,
        category: q.category,
        status: q.status,
        isAnonymous: true,
        alias: q.alias,
        isPublicAnswer: q.status === 'PUBLIC',
        assignedToId: q.status !== 'OPEN' ? adminUser.id : undefined,
      },
    });

    if (q.privateAnswer) {
      await prisma.youthAnswer.create({
        data: {
          questionId: row.id,
          authorId: adminUser.id,
          body: q.privateAnswer,
          isPublic: false,
        },
      });
    }
    if (q.publicAnswer) {
      await prisma.youthAnswer.create({
        data: {
          questionId: row.id,
          authorId: adminUser.id,
          body: q.publicAnswer,
          isPublic: true,
        },
      });
    }
  }

  const prayerSamples = [
    {
      content: 'Please pray for my grandma — she is having surgery this week.',
      category: 'HEALTH' as const,
      alias: 'Anonymous',
      memberId: emma?.id,
      prayCount: 3,
    },
    {
      content: 'Grateful for our youth group — thanking God for new friends!',
      category: 'THANKSGIVING' as const,
      alias: 'Joyful',
      memberId: lily?.id,
      isAnonymous: true,
      prayCount: 5,
    },
    {
      content: 'Struggling with anxiety before exams. Would appreciate prayer.',
      category: 'SCHOOL' as const,
      alias: 'Student',
      memberId: noah?.id,
      prayCount: 1,
    },
  ];

  for (const p of prayerSamples) {
    if (!p.memberId) continue;
    const exists = await prisma.youthPrayerRequest.findFirst({
      where: { churchId: church.id, content: p.content },
    });
    if (exists) continue;
    const row = await prisma.youthPrayerRequest.create({
      data: {
        churchId: church.id,
        memberId: p.memberId,
        content: p.content,
        category: p.category,
        isAnonymous: p.isAnonymous !== false,
        alias: p.alias,
        prayCount: p.prayCount,
        allowComments: true,
        status: 'ACTIVE',
      },
    });
    if (noah && p.memberId === emma?.id) {
      await prisma.youthPrayerSupport.upsert({
        where: {
          prayerId_memberId_supportType: {
            prayerId: row.id,
            memberId: noah.id,
            supportType: 'PRAY',
          },
        },
        create: { prayerId: row.id, memberId: noah.id, supportType: 'PRAY' },
        update: {},
      });
      await prisma.youthPrayerSupport.create({
        data: {
          prayerId: row.id,
          memberId: noah.id,
          supportType: 'ENCOURAGEMENT',
          body: 'Praying with you — you are not alone!',
        },
      }).catch(() => undefined);
    }
  }

  const gamify = async (memberId: string | undefined, points: number, streak: number) => {
    if (!memberId) return;
    await prisma.memberGamification.upsert({
      where: { memberId },
      create: { memberId, points, attendanceStreak: streak, lastAttendance: new Date() },
      update: { points, attendanceStreak: streak, lastAttendance: new Date() },
    });
  };

  await gamify(emma?.id, 120, 4);
  await gamify(noah?.id, 45, 2);
  await gamify(lily?.id, 80, 3);
  await gamify(chloeW?.id, 30, 1);

  const firstEventBadge = await prisma.badge.findFirst({ where: { name: 'First Event' } });
  if (firstEventBadge && emma) {
    await prisma.memberBadge.upsert({
      where: { memberId_badgeId: { memberId: emma.id, badgeId: firstEventBadge.id } },
      create: { memberId: emma.id, badgeId: firstEventBadge.id },
      update: {},
    });
  }

  // ─── Kingdom Konnect (Adult Business Community) ───────────
  const michael = memberByEmail['michael@demo.church'];
  const sarah = memberByEmail['sarah@demo.church'];
  const thomas = extraMembers.find((x) => x.firstName === 'Thomas');
  const david = memberByEmail['david@demo.church'];
  const james = extraMembers.find((x) => x.firstName === 'James' && x.lastName === 'Adebayo');

  const businessDefs = [
    {
      member: michael,
      businessName: 'Chen Consulting Group',
      tagline: 'Kingdom-minded business advisory',
      category: 'Professional Services',
      description: 'Strategy, operations, and faith-aligned leadership coaching for SMEs.',
      website: 'https://example.com/chen-consulting',
      phone: '+44 7700 901002',
      email: 'michael@demo.church',
      verified: true,
      featured: true,
      listings: [
        { title: '90-min Business Health Check', itemType: 'SERVICE' as const, price: 150, description: 'Diagnostic session for church entrepreneurs' },
        { title: 'Quarterly Advisory Retainer', itemType: 'SERVICE' as const, price: 800 },
      ],
    },
    {
      member: sarah,
      businessName: 'Harmony Events & Catering',
      tagline: 'Celebrations with excellence',
      category: 'Food & Hospitality',
      description: 'Catering for church events, weddings, and fellowship meals.',
      phone: '+44 7700 901001',
      email: 'sarah@demo.church',
      verified: true,
      featured: false,
      listings: [
        { title: 'Fellowship Lunch Package (50 guests)', itemType: 'SERVICE' as const, price: 450 },
        { title: 'Custom Cake — Member Discount', itemType: 'PRODUCT' as const, price: 35 },
      ],
    },
    {
      member: thomas,
      businessName: 'Williams Media Studio',
      tagline: 'Visual storytelling for ministry',
      category: 'Creative & Media',
      description: 'Video production, livestream support, and brand assets for churches.',
      verified: true,
      listings: [{ title: 'Sunday Service Livestream Setup', itemType: 'SERVICE' as const, price: 200 }],
    },
    {
      member: david,
      businessName: 'Okonkwo Plumbing & Heating',
      tagline: 'Reliable trades with integrity',
      category: 'Construction & Trades',
      description: 'Residential plumbing — member referral discount available.',
      verified: false,
      listings: [],
    },
  ];

  for (const b of businessDefs) {
    if (!b.member) continue;
    let profile = await prisma.businessProfile.findFirst({ where: { memberId: b.member.id } });
    if (!profile) {
      profile = await prisma.businessProfile.create({
        data: {
          churchId: church.id,
          memberId: b.member.id,
          businessName: b.businessName,
          tagline: b.tagline,
          description: b.description,
          category: b.category,
          website: b.website,
          phone: b.phone,
          email: b.email,
          verificationStatus: b.verified ? 'VERIFIED' : 'PENDING',
          verifiedAt: b.verified ? new Date() : undefined,
          isFeatured: b.featured ?? false,
        },
      });
    } else {
      profile = await prisma.businessProfile.update({
        where: { id: profile.id },
        data: {
          verificationStatus: b.verified ? 'VERIFIED' : 'PENDING',
          verifiedAt: b.verified ? new Date() : null,
          isFeatured: b.featured ?? false,
        },
      });
    }
    for (const listing of b.listings) {
      const exists = await prisma.marketplaceItem.findFirst({
        where: { businessId: profile.id, title: listing.title },
      });
      if (!exists) {
        await prisma.marketplaceItem.create({
          data: {
            churchId: church.id,
            businessId: profile.id,
            title: listing.title,
            description: 'description' in listing ? listing.description : undefined,
            itemType: listing.itemType,
            price: listing.price,
            currency: 'GBP',
          },
        });
      }
    }
  }

  const michaelProfile = michael
    ? await prisma.businessProfile.findFirst({ where: { memberId: michael.id } })
    : null;
  const sarahProfile = sarah ? await prisma.businessProfile.findFirst({ where: { memberId: sarah.id } }) : null;

  const jobDefs = [
    {
      title: 'Part-time Church Administrator',
      description: 'Support office operations, member communications, and event coordination. 15 hrs/week.',
      location: 'Dartford',
      jobType: 'Part-time',
      salaryRange: '£12–14/hr',
      contactEmail: 'admin@demo.church',
    },
    {
      title: 'Junior Video Editor',
      description: 'Edit sermon highlights and social clips. Portfolio required.',
      businessId: thomas ? (await prisma.businessProfile.findFirst({ where: { memberId: thomas.id } }))?.id : undefined,
      location: 'Remote',
      jobType: 'Part-time',
      salaryRange: 'Negotiable',
    },
    {
      title: 'Business Mentor Volunteers',
      description: 'Experienced entrepreneurs to mentor members launching businesses.',
      businessId: michaelProfile?.id,
      jobType: 'Volunteer',
      contactEmail: 'michael@demo.church',
    },
  ];

  for (const j of jobDefs) {
    const exists = await prisma.jobPosting.findFirst({ where: { churchId: church.id, title: j.title } });
    if (!exists) {
      await prisma.jobPosting.create({
        data: {
          churchId: church.id,
          title: j.title,
          description: j.description,
          location: j.location,
          jobType: j.jobType,
          salaryRange: j.salaryRange,
          contactEmail: j.contactEmail,
          businessId: j.businessId,
        },
      });
    }
  }

  const konnectEventDefs = [
    {
      title: 'Kingdom Konnect Breakfast',
      description: 'Monthly networking over breakfast — share cards, pray, and collaborate.',
      location: 'Fellowship Hall',
      daysFromNow: 12,
      maxAttendees: 40,
      businessId: sarahProfile?.id,
      hostMemberId: sarah?.id,
    },
    {
      title: 'Entrepreneurs Roundtable',
      description: 'Panel on faith, finance, and scaling a business ethically.',
      location: 'Conference Room B',
      daysFromNow: 26,
      maxAttendees: 25,
      businessId: michaelProfile?.id,
      hostMemberId: michael?.id,
    },
  ];

  for (const ev of konnectEventDefs) {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + ev.daysFromNow);
    let event = await prisma.konnectNetworkingEvent.findFirst({ where: { churchId: church.id, title: ev.title } });
    if (!event) {
      event = await prisma.konnectNetworkingEvent.create({
        data: {
          churchId: church.id,
          title: ev.title,
          description: ev.description,
          location: ev.location,
          startsAt,
          maxAttendees: ev.maxAttendees,
          businessId: ev.businessId,
          hostMemberId: ev.hostMemberId,
        },
      });
    }
    if (david && ev.title === 'Kingdom Konnect Breakfast') {
      await prisma.konnectEventRsvp.upsert({
        where: { eventId_memberId: { eventId: event.id, memberId: david.id } },
        create: { eventId: event.id, memberId: david.id },
        update: {},
      });
    }
  }

  if (michael && james) {
    const exists = await prisma.mentorshipLink.findFirst({
      where: { mentorMemberId: michael.id, menteeMemberId: james.id },
    });
    if (!exists) {
      await prisma.mentorshipLink.create({
        data: {
          churchId: church.id,
          mentorMemberId: michael.id,
          menteeMemberId: james.id,
          focusArea: 'Entrepreneurship',
          goals: 'Launch community catering pilot with church kitchen access',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });
    }
  }
  if (sarah && david) {
    const exists = await prisma.mentorshipLink.findFirst({
      where: { mentorMemberId: sarah.id, menteeMemberId: david.id },
    });
    if (!exists) {
      await prisma.mentorshipLink.create({
        data: {
          churchId: church.id,
          mentorMemberId: sarah.id,
          menteeMemberId: david.id,
          focusArea: 'Career Development',
          status: 'REQUESTED',
        },
      });
    }
  }

  // ─── Communication Hub ────────────────────────────────────
  const announcementSamples = [
    {
      title: 'Sunday Service — Guest Speaker',
      content: 'Join us this Sunday at 10:30am. Nursery and youth programmes available.',
      category: 'Events',
      isPinned: true,
    },
    {
      title: 'Midweek Prayer — Wednesday 7pm',
      content: 'Prayer squad meets in the main sanctuary. All welcome.',
      category: 'Prayer',
      isPinned: false,
    },
    {
      title: 'Building Fund Update',
      content: 'Thank you for your generosity. Phase 2 renovations begin next month.',
      category: 'Giving',
      isPinned: false,
    },
    {
      title: 'Sunday Worship — 10:30 AM',
      content: 'Main sanctuary. Communion this week. Arrive 15 minutes early for worship team warm-up.',
      category: 'Church Service',
      isPinned: true,
    },
    {
      title: 'Youth Service — Friday 6 PM',
      content: 'Teens hall. Pizza fellowship after service. Parents pickup at 8 PM.',
      category: 'Church Service',
      isPinned: false,
    },
    {
      title: 'Bible Study — Tuesday 7 PM',
      content: 'Fellowship room B. Current series: Book of Acts. Bring your Bible and a friend.',
      category: 'Church Service',
      isPinned: false,
    },
  ];

  for (const a of announcementSamples) {
    const exists = await prisma.announcement.findFirst({ where: { churchId: church.id, title: a.title } });
    if (!exists) {
      await prisma.announcement.create({
        data: { churchId: church.id, ...a, authorId: adminUser.id },
      });
    }
  }

  const devotionalExists = await prisma.devotionalPlan.findFirst({
    where: { churchId: church.id, title: '21 Days of Prayer' },
  });
  if (!devotionalExists) {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 21);
    await prisma.devotionalPlan.create({
      data: {
        churchId: church.id,
        title: '21 Days of Prayer',
        description: 'Daily scripture and reflection for corporate prayer season.',
        startDate: start,
        endDate: end,
        entries: [
          { day: 1, title: 'Seek First', scripture: 'Matthew 6:33', reflection: 'Put God at the centre of decisions today.' },
          { day: 2, title: 'Bold Faith', scripture: 'Hebrews 11:1', reflection: 'Trust God for the unseen.' },
          { day: 3, title: 'Grateful Heart', scripture: 'Psalm 100:4', reflection: 'Enter His gates with thanksgiving.' },
        ],
      },
    });
  }

  const channelDefs = [
    { name: 'Church-wide Updates', description: 'General fellowship chat', channelType: 'CHURCH' as const },
    { name: 'Prayer & Intercession', description: 'Share prayer points and praises', channelType: 'CHURCH' as const },
    { name: 'Volunteers Coordination', description: 'Ushering, media, hospitality teams', channelType: 'CHURCH' as const },
  ];

  for (const ch of channelDefs) {
    let channel = await prisma.chatChannel.findFirst({ where: { churchId: church.id, name: ch.name } });
    if (!channel) {
      channel = await prisma.chatChannel.create({
        data: { churchId: church.id, name: ch.name, description: ch.description, channelType: ch.channelType, isModerated: true },
      });
      await prisma.message.create({
        data: {
          channelId: channel.id,
          senderId: adminUser.id,
          content: `Welcome to ${ch.name}! Please keep conversations respectful and encouraging.`,
        },
      });
    }
  }

  const prayerChannel = await prisma.chatChannel.findFirst({
    where: { churchId: church.id, name: 'Prayer & Intercession' },
  });
  if (prayerChannel) {
    const msgCount = await prisma.message.count({ where: { channelId: prayerChannel.id } });
    if (msgCount < 2) {
      await prisma.message.create({
        data: {
          channelId: prayerChannel.id,
          senderId: adminUser.id,
          content: 'Please no spam in this channel',
          isFlagged: true,
          flagReason: 'Flagged keyword: spam',
          isHidden: true,
        },
      });
    }
  }

  const sarahUser = await prisma.user.findFirst({ where: { email: 'sarah@demo.church' } });
  if (sarahUser && adminUser.id !== sarahUser.id) {
    const exists = await prisma.inAppMessage.findFirst({
      where: { churchId: church.id, senderId: adminUser.id, recipientId: sarahUser.id },
    });
    if (!exists) {
      await prisma.inAppMessage.create({
        data: {
          churchId: church.id,
          senderId: adminUser.id,
          recipientId: sarahUser.id,
          subject: 'Volunteer schedule',
          body: 'Hi Sarah — can you confirm availability for next Sunday media team?',
        },
      });
    }
  }

  const notifExists = await prisma.notification.findFirst({
    where: { churchId: church.id, title: 'Welcome to Communication Hub' },
  });
  if (!notifExists) {
    await prisma.notification.create({
      data: {
        churchId: church.id,
        userId: adminUser.id,
        title: 'Welcome to Communication Hub',
        body: 'Use this hub to manage push, messages, announcements, and group chats.',
        type: 'SYSTEM',
      },
    });
  }

  const sampleMember = memberByEmail['sarah@demo.church'];
  if (sampleMember) {
    const approvedCount = await prisma.communitySupportRequest.count({
      where: { churchId: church.id, status: 'APPROVED' },
    });
    if (approvedCount < 12) {
      const seeds: Array<{
        requestType: 'JOB_SEARCH' | 'BUSINESS_SEARCH';
        title: string;
        description: string;
        location?: string;
        skills?: string;
        status: 'APPROVED' | 'PENDING';
      }> = [
        {
          requestType: 'JOB_SEARCH',
          title: 'Administrative assistant',
          description: 'Part-time admin role in a faith-friendly workplace. Scheduling and member care experience preferred.',
          location: 'London',
          skills: 'Admin, scheduling',
          status: 'APPROVED',
        },
        {
          requestType: 'BUSINESS_SEARCH',
          title: 'Christian bookstore partnership',
          description: 'Seeking a local Christian bookstore for event pop-ups and resource tables after Sunday service.',
          location: 'Greater London',
          status: 'APPROVED',
        },
        {
          requestType: 'JOB_SEARCH',
          title: 'Worship team keyboardist',
          description: 'Experienced keyboardist available for freelance worship sessions and special events.',
          location: 'South London',
          skills: 'Keys, worship leading',
          status: 'APPROVED',
        },
        {
          requestType: 'JOB_SEARCH',
          title: 'IT support volunteer → paid role',
          description: 'Looking for transition from volunteer AV/IT support to part-time paid church tech role.',
          location: 'Remote / hybrid',
          skills: 'ProPresenter, streaming',
          status: 'APPROVED',
        },
        {
          requestType: 'BUSINESS_SEARCH',
          title: 'Catering for church events',
          description: 'Member-owned catering business seeking opportunities for conferences, weddings, and fellowship meals.',
          location: 'Croydon',
          status: 'APPROVED',
        },
        {
          requestType: 'JOB_SEARCH',
          title: 'Accountant (charity sector)',
          description: 'Qualified accountant seeking finance role with a Christian charity or church organisation.',
          location: 'London',
          skills: 'ACCA, charity SORP',
          status: 'APPROVED',
        },
        {
          requestType: 'JOB_SEARCH',
          title: 'Primary school teaching assistant',
          description: 'Experienced TA looking for a school with strong values and supportive leadership.',
          location: 'Bromley',
          status: 'APPROVED',
        },
        {
          requestType: 'BUSINESS_SEARCH',
          title: 'Printing for outreach flyers',
          description: 'Small print shop offering discounted bulk printing for evangelism and community outreach.',
          location: 'Peckham',
          status: 'APPROVED',
        },
        {
          requestType: 'JOB_SEARCH',
          title: 'Healthcare worker — locum shifts',
          description: 'Registered nurse available for locum shifts; prefers employers respectful of faith and Sabbath where possible.',
          location: 'London',
          status: 'APPROVED',
        },
        {
          requestType: 'BUSINESS_SEARCH',
          title: 'Coaching & mentorship business',
          description: 'Life coaching practice open to partnering with church career ministry and young professionals network.',
          location: 'Online',
          status: 'APPROVED',
        },
        {
          requestType: 'JOB_SEARCH',
          title: 'Driver for seniors ministry',
          description: 'Reliable driver offering lifts for seniors to midweek services and grocery runs.',
          location: 'Lambeth',
          skills: 'DVLA clean licence',
          status: 'APPROVED',
        },
        {
          requestType: 'JOB_SEARCH',
          title: 'Graphic designer (freelance)',
          description: 'Freelance designer available for sermon series artwork, event posters, and social media kits.',
          location: 'Remote',
          skills: 'Figma, Canva',
          status: 'APPROVED',
        },
        {
          requestType: 'JOB_SEARCH',
          title: 'Youth mentor — pending review',
          description: 'Open to mentoring teens in career planning and faith integration.',
          status: 'PENDING',
        },
      ];

      const existingTitles = new Set(
        (
          await prisma.communitySupportRequest.findMany({
            where: { churchId: church.id },
            select: { title: true },
          })
        ).map((r) => r.title),
      );

      const toCreate = seeds
        .filter((s) => !existingTitles.has(s.title))
        .map((s) => ({
          churchId: church.id,
          memberId: sampleMember.id,
          requestType: s.requestType,
          title: s.title,
          description: s.description,
          location: s.location,
          skills: s.skills,
          status: s.status,
          approvedAt: s.status === 'APPROVED' ? new Date() : undefined,
          approvedById: s.status === 'APPROVED' ? adminUser.id : undefined,
        }));

      if (toCreate.length > 0) {
        await prisma.communitySupportRequest.createMany({ data: toCreate });
      }
    }
  }

  const { seedTestUsers } = await import('./seed-test-users');
  await seedTestUsers(prisma, church.id, passwordHash, {
    ADMIN: adminRole,
    PASTOR: await prisma.role.findUniqueOrThrow({ where: { name: 'PASTOR' } }),
    LEADER: await prisma.role.findUniqueOrThrow({ where: { name: 'LEADER' } }),
    MEMBER: memberRole,
    DRIVER: await prisma.role.findUniqueOrThrow({ where: { name: 'DRIVER' } }),
  });

  const { seedPlatformAdmin } = await import('./seed-platform-admin');
  await seedPlatformAdmin(prisma);

  const hubPostCount = await prisma.communityHubPost.count({
    where: { churchId: church.id },
  });
  if (hubPostCount < 8) {
    const sarahUser = await prisma.user.findFirst({ where: { email: 'sarah@demo.church' } });
    const michaelUser = await prisma.user.findFirst({ where: { email: 'michael@demo.church' } });
    const authors = [
      { userId: adminUser.id, memberId: member.id },
      ...(sarahUser
        ? [
            {
              userId: sarahUser.id,
              memberId: memberByEmail['sarah@demo.church']?.id ?? null,
            },
          ]
        : []),
      ...(michaelUser
        ? [
            {
              userId: michaelUser.id,
              memberId: memberByEmail['michael@demo.church']?.id ?? null,
            },
          ]
        : []),
    ];
    const pickAuthor = (i: number) => authors[i % authors.length];

    const prayerSeeds = [
      {
        subject: 'Healing for my mum',
        description:
          'Please pray for my mother’s recovery after surgery. We trust God for complete healing and peace for our family.',
        displayName: 'Sarah M.',
      },
      {
        subject: 'Wisdom for exams',
        description:
          'Final exams next week — asking for focus, calm, and God’s guidance in every paper.',
        displayName: null,
      },
      {
        subject: 'Job provision',
        description:
          'Been searching for work for three months. Praying for open doors and favour with employers.',
        displayName: 'Michael T.',
      },
      {
        subject: 'Marriage restoration',
        description:
          'Please stand with us as we seek counselling and healing in our marriage. We believe God can restore.',
        displayName: null,
      },
      {
        subject: 'Church outreach team',
        description:
          'Pray for safety and boldness for our street outreach this Saturday.',
        displayName: 'Youth team',
      },
      {
        subject: 'Grief & comfort',
        description:
          'Lost a dear friend this month. Asking the body to pray for comfort and hope in Christ.',
        displayName: null,
      },
    ];

    const testimonySeeds = [
      {
        testimony: 'Debt cleared!',
        description:
          'After months of prayer and faithful giving, we paid off the last of our debt. God is faithful!',
        displayName: 'Anonymous believer',
        showDisplayName: true,
      },
      {
        testimony: 'Baptism Sunday',
        description:
          'I gave my life to Jesus at youth camp and was baptised yesterday. So grateful for this church family.',
        displayName: 'Jordan',
        showDisplayName: true,
      },
      {
        testimony: 'Answered prayer for housing',
        description:
          'We were facing eviction. The church prayed with us and within two weeks we signed a new lease. Praise God!',
        displayName: null,
        showDisplayName: false,
      },
      {
        testimony: 'Healed anxiety',
        description:
          'Counselling, prayer, and small group support helped me walk free from panic attacks. Still growing but free.',
        displayName: 'Grace',
        showDisplayName: true,
      },
      {
        testimony: 'First salary tithe',
        description:
          'Got my first job and tithed for the first time — joy overflowed seeing God provide the rest of the month.',
        displayName: null,
        showDisplayName: false,
      },
      {
        testimony: 'Family reunited',
        description:
          'Estranged from my brother for years. After a prayer chain in Prayer Hub we reconciled over coffee last Sunday.',
        displayName: 'Demo Member',
        showDisplayName: true,
      },
    ];

    const approvedAt = new Date(Date.now() - 86400000);
    for (let i = 0; i < prayerSeeds.length; i++) {
      const s = prayerSeeds[i];
      const author = pickAuthor(i);
      const exists = await prisma.communityHubPost.findFirst({
        where: { churchId: church.id, type: 'PRAYER', subject: s.subject },
      });
      if (exists) continue;
      await prisma.communityHubPost.create({
        data: {
          churchId: church.id,
          type: 'PRAYER',
          authorUserId: author.userId,
          authorMemberId: author.memberId,
          subject: s.subject,
          description: s.description,
          displayName: s.displayName,
          showDisplayName: !!s.displayName,
          status: 'APPROVED',
          approvedAt,
          approvedById: adminUser.id,
          autoApproveAt: approvedAt,
        },
      });
    }

    for (let i = 0; i < testimonySeeds.length; i++) {
      const s = testimonySeeds[i];
      const author = pickAuthor(i + 1);
      const exists = await prisma.communityHubPost.findFirst({
        where: { churchId: church.id, type: 'PRAISE', testimony: s.testimony },
      });
      if (exists) continue;
      await prisma.communityHubPost.create({
        data: {
          churchId: church.id,
          type: 'PRAISE',
          authorUserId: author.userId,
          authorMemberId: author.memberId,
          testimony: s.testimony,
          description: s.description,
          displayName: s.displayName,
          showDisplayName: s.showDisplayName,
          status: 'APPROVED',
          approvedAt,
          approvedById: adminUser.id,
          autoApproveAt: approvedAt,
        },
      });
    }

    const samplePrayer = await prisma.communityHubPost.findFirst({
      where: { churchId: church.id, type: 'PRAYER', status: 'APPROVED' },
    });
    if (samplePrayer && sarahUser) {
      await prisma.communityHubLike.upsert({
        where: {
          postId_userId: { postId: samplePrayer.id, userId: sarahUser.id },
        },
        update: {},
        create: { postId: samplePrayer.id, userId: sarahUser.id },
      });
      const commentExists = await prisma.communityHubComment.findFirst({
        where: { postId: samplePrayer.id, userId: adminUser.id },
      });
      if (!commentExists) {
        await prisma.communityHubComment.create({
          data: {
            postId: samplePrayer.id,
            userId: adminUser.id,
            memberId: member.id,
            body: 'Standing in faith with you — we are praying!',
          },
        });
      }
    }
  }

  const graceUser = await prisma.user.findFirst({
    where: { email: 'grace@demo.church', churchId: church.id },
  });
  if (graceUser) {
    await prisma.driverProfile.upsert({
      where: { userId: graceUser.id },
      update: { isActive: true },
      create: { userId: graceUser.id, licenseNo: 'DEMO-UK-001', isActive: true },
    });
  }

  const churches = await prisma.church.findMany({ select: { id: true, settings: true } });
  for (const row of churches) {
    const settings = mergeTenantModulesIntoSettings(
      (row.settings && typeof row.settings === 'object'
        ? row.settings
        : {}) as Record<string, unknown>,
      { wisdom365Plus: true },
    );
    await prisma.church.update({
      where: { id: row.id },
      data: { settings: settings as object },
    });
  }

  console.log('Seed complete:', { church: church.slug, admin: adminUser.email, member: member.id });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
