/**
 * Church Staff → unit leader assignment: assign / revoke / scope / forbid / cross-church.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

const FOREIGN_UNIT_ID = '99999999-9999-4999-8999-999999999999';

async function mintAccessToken(app: INestApplication, email: string): Promise<string> {
  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  const config = app.get(ConfigService);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
  });
  if (!user) {
    throw new Error(`Seed user missing for unit-leader tests: ${email}`);
  }
  return jwt.signAsync(
    { sub: user.id, churchId: user.churchId, email: user.email },
    {
      secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    },
  );
}

describeE2e('Church Staff unit leader assignment', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let memberToken: string;
  let unitAId: string;
  let unitBId: string;
  let createdStaffId: string | null = null;
  let leaderEmail: string;
  let leaderPasswordHash: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);

    adminToken = await mintAccessToken(app, 'admin@demo.church');
    memberToken = await mintAccessToken(app, 'member@demo.church');
    leaderPasswordHash = await bcrypt.hash('ChurchHub123!', 12);

    const unitsRes = await request(app.getHttpServer())
      .get('/api/v1/service-units')
      .set(auth(adminToken));
    expect(unitsRes.status).toBe(200);
    const units = unitsRes.body as Array<{ id: string; name: string }>;
    expect(units.length).toBeGreaterThanOrEqual(2);
    unitAId = units[0].id;
    unitBId = units[1].id;
    expect(unitAId).not.toBe(unitBId);

    leaderEmail = `unit-leader-e2e-${Date.now()}@demo.church`;
  }, 120_000);

  afterAll(async () => {
    if (createdStaffId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/church-staff/${createdStaffId}`)
        .set(auth(adminToken));
    }
    await app?.close();
  });

  it('rejects unauthenticated church-staff access', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/church-staff');
    expect([401, 403]).toContain(res.status);
  });

  it('forbids MEMBER from church-staff routes', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/church-staff')
      .set(auth(memberToken));
    expect(list.status).toBe(403);

    const create = await request(app.getHttpServer())
      .post('/api/v1/church-staff')
      .set(auth(memberToken))
      .send({
        email: `forbidden-${Date.now()}@demo.church`,
        password: 'ChurchHub123!',
        firstName: 'Nope',
        lastName: 'Member',
        roles: ['LEADER'],
        serviceUnitIds: [unitAId],
      });
    expect(create.status).toBe(403);
  });

  it('rejects unit-only LEADER create without service units', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/church-staff')
      .set(auth(adminToken))
      .send({
        email: `missing-units-${Date.now()}@demo.church`,
        password: 'ChurchHub123!',
        firstName: 'Missing',
        lastName: 'Units',
        roles: ['LEADER'],
      });
    expect(res.status).toBe(400);
  });

  it('rejects cross-church / unknown serviceUnitIds', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/church-staff')
      .set(auth(adminToken))
      .send({
        email: `cross-church-${Date.now()}@demo.church`,
        password: 'ChurchHub123!',
        firstName: 'Cross',
        lastName: 'Church',
        roles: ['LEADER'],
        serviceUnitIds: [FOREIGN_UNIT_ID],
      });
    expect(res.status).toBe(400);
    expect(String(res.body.message ?? '')).toMatch(/service unit/i);
  });

  it('creates unit-only LEADER with unit admin leadership', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/church-staff')
      .set(auth(adminToken))
      .send({
        email: leaderEmail,
        password: 'ChurchHub123!',
        firstName: 'Unit',
        lastName: 'LeaderE2E',
        roles: ['LEADER'],
        serviceUnitIds: [unitAId],
      });
    expect([200, 201]).toContain(res.status);
    createdStaffId = res.body.id;
    expect(createdStaffId).toBeTruthy();
    expect(res.body.roles.map((r: { name: string }) => r.name)).toContain('LEADER');
    expect(res.body.serviceUnitIds).toEqual([unitAId]);
    expect(res.body.ledServiceUnits?.[0]?.id).toBe(unitAId);

    const member = await prisma.member.findFirst({
      where: { userId: createdStaffId! },
      include: {
        serviceUnitLeaderships: {
          where: { isUnitAdmin: true },
          select: { serviceUnitId: true },
        },
      },
    });
    expect(member).toBeTruthy();
    expect(member!.serviceUnitLeaderships.map((l) => l.serviceUnitId)).toEqual([unitAId]);
  });

  it('unit leader session is not church staff and is scoped to assigned unit', async () => {
    expect(createdStaffId).toBeTruthy();
    // Ensure password hash present for any later login-based suites; mint JWT for 2FA-safe e2e.
    await prisma.user.update({
      where: { id: createdStaffId! },
      data: { passwordHash: leaderPasswordHash },
    });
    const leaderToken = await mintAccessToken(app, leaderEmail);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(auth(leaderToken));
    expect(me.status).toBe(200);
    expect(me.body.isChurchStaff).toBe(false);
    expect(me.body.canManageStaff).toBe(false);
    expect(me.body.unitAdminUnitIds).toContain(unitAId);
    expect(me.body.unitAdminUnitIds).not.toContain(unitBId);

    const accessA = await request(app.getHttpServer())
      .get(`/api/v1/service-units/${unitAId}/access`)
      .set(auth(leaderToken));
    expect(accessA.status).toBe(200);
    expect(accessA.body.canManage).toBe(true);
    expect(accessA.body.isChurchStaff).toBe(false);

    const accessB = await request(app.getHttpServer())
      .get(`/api/v1/service-units/${unitBId}/access`)
      .set(auth(leaderToken));
    expect(accessB.status).toBe(200);
    expect(accessB.body.canManage).toBe(false);

    const staffList = await request(app.getHttpServer())
      .get('/api/v1/church-staff')
      .set(auth(leaderToken));
    expect(staffList.status).toBe(403);

    const createUnit = await request(app.getHttpServer())
      .post('/api/v1/service-units')
      .set(auth(leaderToken))
      .send({ name: `Should Fail ${Date.now()}` });
    expect(createUnit.status).toBe(403);

    const patchOther = await request(app.getHttpServer())
      .patch(`/api/v1/service-units/${unitBId}`)
      .set(auth(leaderToken))
      .send({ description: 'should not update' });
    expect(patchOther.status).toBe(403);

    const patchOwn = await request(app.getHttpServer())
      .patch(`/api/v1/service-units/${unitAId}`)
      .set(auth(leaderToken))
      .send({ description: `E2E unit-leader scope ${Date.now()}` });
    expect(patchOwn.status).toBe(200);
  });

  it('updates leadership to another unit and revokes prior assignment', async () => {
    expect(createdStaffId).toBeTruthy();
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/church-staff/${createdStaffId}`)
      .set(auth(adminToken))
      .send({
        roles: ['LEADER'],
        serviceUnitIds: [unitBId],
      });
    expect(res.status).toBe(200);
    expect(res.body.serviceUnitIds).toEqual([unitBId]);
    expect(res.body.ledServiceUnits?.map((u: { id: string }) => u.id)).toEqual([unitBId]);

    const leaderToken = await mintAccessToken(app, leaderEmail);

    const accessA = await request(app.getHttpServer())
      .get(`/api/v1/service-units/${unitAId}/access`)
      .set(auth(leaderToken));
    expect(accessA.body.canManage).toBe(false);

    const accessB = await request(app.getHttpServer())
      .get(`/api/v1/service-units/${unitBId}/access`)
      .set(auth(leaderToken));
    expect(accessB.body.canManage).toBe(true);
  });

  it('rejects clearing all units while remaining unit-only LEADER', async () => {
    expect(createdStaffId).toBeTruthy();
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/church-staff/${createdStaffId}`)
      .set(auth(adminToken))
      .send({
        roles: ['LEADER'],
        serviceUnitIds: [],
      });
    expect(res.status).toBe(400);
  });

  it('clears unit leadership when demoted away from leadership roles', async () => {
    expect(createdStaffId).toBeTruthy();
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/church-staff/${createdStaffId}`)
      .set(auth(adminToken))
      .send({
        roles: ['MEMBER'],
      });
    expect(res.status).toBe(200);
    expect(res.body.serviceUnitIds ?? []).toEqual([]);

    const member = await prisma.member.findFirst({
      where: { userId: createdStaffId! },
      include: {
        serviceUnitLeaderships: {
          where: { isUnitAdmin: true },
          select: { id: true },
        },
      },
    });
    expect(member?.serviceUnitLeaderships ?? []).toEqual([]);
  });
});
