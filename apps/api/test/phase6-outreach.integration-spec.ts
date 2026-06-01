import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('Phase 6 — Outreach evangelism E2E', () => {
  let app: INestApplication;
  let accessToken: string;

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

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.church', password: 'ChurchHub123!' });
    accessToken = login.body.accessToken;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET /outreach/pipeline returns convert pipeline', () => {
    return request(app.getHttpServer())
      .get('/api/v1/outreach/pipeline')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.byStage).toBeDefined();
        expect(Array.isArray(res.body.contacts)).toBe(true);
      });
  });

  it('POST /outreach/capture accepts bus pickup fields', () => {
    return request(app.getHttpServer())
      .post('/api/v1/outreach/capture')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: `Phase6Test${Date.now()}`,
        phone: '+44000009999',
        needsBusPickup: true,
        pickupAddress: 'Test Street',
        voiceNotes: 'Voice note test',
        sendWelcome: false,
      })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      })
      .expect((res) => {
        expect(res.body.needsBusPickup).toBe(true);
        expect(res.body.convertStage).toBe('CAPTURED');
      });
  });
});
