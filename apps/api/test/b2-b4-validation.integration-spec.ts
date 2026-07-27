/**
 * B2–B4 validation feature tests — HTTP layer returns 400 for invalid payloads.
 * Covers auth/staff/platform (B2) and ministry-cells branch/province (B3+B4).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

async function mintAccessToken(app: INestApplication, email: string): Promise<string> {
  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  const config = app.get(ConfigService);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
  });
  if (!user) {
    throw new Error(`Seed user missing for validation tests: ${email}`);
  }
  return jwt.signAsync(
    { sub: user.id, churchId: user.churchId, email: user.email },
    {
      secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    },
  );
}

describeE2e('B2–B4 validation (HTTP → 400)', () => {
  let app: INestApplication;
  let adminToken: string;
  let platformToken: string | null = null;

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

    adminToken = await mintAccessToken(app, 'admin@demo.church');
    try {
      platformToken = await mintAccessToken(app, 'www.knightappsolutionshub@gmail.com');
    } catch {
      platformToken = null;
    }
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  describe('B2 auth', () => {
    it('POST /auth/login rejects invalid email → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'ChurchHub123!' });
      expect(res.status).toBe(400);
    });

    it('POST /auth/register/start rejects short password → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register/start')
        .send({
          churchName: 'Validation Church',
          firstName: 'Ann',
          lastName: 'Admin',
          email: 'ann@example.com',
          password: 'short',
        });
      expect(res.status).toBe(400);
    });

    it('POST /auth/refresh rejects short refresh token → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'short' });
      expect(res.status).toBe(400);
    });

    it('POST /auth/magic-link rejects invalid email → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: 'bad' });
      expect(res.status).toBe(400);
    });

    it('POST /auth/reset-password rejects short token / password → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'too-short', newPassword: 'x' });
      expect(res.status).toBe(400);
    });
  });

  describe('B2 church-staff', () => {
    it('POST /church-staff rejects invalid role → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/church-staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'staff-b2@demo.church',
          password: 'ChurchHub123!',
          firstName: 'Ann',
          lastName: 'Admin',
          roles: ['NOT_A_ROLE'],
        });
      expect(res.status).toBe(400);
    });

    it('POST /church-staff rejects short password → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/church-staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'staff-b2b@demo.church',
          password: 'short',
          firstName: 'Ann',
          lastName: 'Admin',
          roles: ['LEADER'],
        });
      expect(res.status).toBe(400);
    });
  });

  describe('B2 platform', () => {
    it('POST /platform/churches rejects empty slug → 400', async () => {
      if (!platformToken) {
        return;
      }
      const res = await request(app.getHttpServer())
        .post('/api/v1/platform/churches')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({
          name: 'Demo Church',
          slug: '!!!',
          adminEmail: 'admin@new-church.test',
        });
      expect(res.status).toBe(400);
    });

    it('POST /platform/churches rejects invalid admin email → 400', async () => {
      if (!platformToken) {
        return;
      }
      const res = await request(app.getHttpServer())
        .post('/api/v1/platform/churches')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({
          name: 'Demo Church',
          slug: 'valid-slug-b2',
          adminEmail: 'not-an-email',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('B3+B4 ministry-cells', () => {
    it('POST /ministry-cells/branches rejects missing name → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ministry-cells/branches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '  ', postcode: 'N1 1AA' });
      expect(res.status).toBe(400);
    });

    it('POST /ministry-cells/branches rejects invalid postcode → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ministry-cells/branches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Validation Cell', postcode: 'NOTAPOSTCODE' });
      expect(res.status).toBe(400);
    });

    it('PATCH /ministry-cells/branches/:id rejects invalid postcode → 400', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/ministry-cells/branches/does-not-matter')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ postcode: 'ZZZZ' });
      // ZodBody runs after guards; invalid body → 400 before service (or 404 if pipe skipped)
      expect(res.status).toBe(400);
    });

    it('POST /ministry-cells/provinces rejects missing name → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ministry-cells/provinces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '', leaderUserId: 'user_x', postcodes: ['N1'] });
      expect(res.status).toBe(400);
    });

    it('POST /ministry-cells/provinces rejects invalid postcode → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ministry-cells/provinces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'North London',
          leaderUserId: 'user_x',
          postcodes: ['not-a-code'],
        });
      expect(res.status).toBe(400);
    });

    it('POST /ministry-cells/branches/:id/map-province rejects empty provinceId → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ministry-cells/branches/any-id/map-province')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ provinceId: '  ' });
      expect(res.status).toBe(400);
    });
  });
});
