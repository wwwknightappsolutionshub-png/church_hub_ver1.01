import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const DEMO_EMAIL = process.env.E2E_LOGIN_EMAIL ?? 'admin@demo.church';
const DEMO_PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? 'ChurchHub123!';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('Devotional Hub E2E', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD });

    if (login.status !== 200 && login.status !== 201) {
      throw new Error(
        `E2E login failed (${login.status}). Run: pnpm --filter @church-hub/api prisma:seed`,
      );
    }
    accessToken = login.body.accessToken ?? login.body.access_token;
    if (!accessToken) throw new Error('No access token in login response');
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  it('GET /devotional-hub/context returns hub context', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/devotional-hub/context')
      .set(auth())
      .expect(200);
    expect(res.body).toHaveProperty('churchId');
    expect(res.body.integrations?.plans).toBe(true);
  });

  it('GET /devotional-hub/plans lists plans', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/devotional-hub/plans?limit=5')
      .set(auth())
      .expect(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('POST /devotional-hub/ai/study-outline creates artifact', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/devotional-hub/ai/study-outline')
      .set(auth())
      .send({
        sourceType: 'CUSTOM_TOPIC',
        customTopic: 'E2E Hope',
        tone: 'ADULT',
        durationDays: 3,
      })
      .expect((r) => expect([200, 201]).toContain(r.status));
    expect(res.body.artifactId).toBeDefined();
    expect(res.body.days?.length).toBe(3);
  });

  it('GET /devotional-hub/ai/artifacts returns recent artifacts', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/devotional-hub/ai/artifacts?limit=5')
      .set(auth())
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /devotional-hub/pdf/imports registers import', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/devotional-hub/pdf/imports')
      .set(auth())
      .send({
        fileName: 'e2e-sample.pdf',
        fileUrl: 'https://example.com/e2e.pdf',
      })
      .expect((r) => expect([200, 201]).toContain(r.status));
    expect(res.body.id).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/devotional-hub/pdf/imports/${res.body.id}/process`)
      .set(auth())
      .expect((r) => expect([200, 201]).toContain(r.status));
  });
});
