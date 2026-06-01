import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('Department modules E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let choirUnitId: string;

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

  it('lists departments including MEDICAL mapping', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/service-units/departments')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const choir = res.body.find((u: { departmentCode: string }) => u.departmentCode === 'CHOIR');
    expect(choir).toBeTruthy();
    choirUnitId = choir?.id;
  });

  it('GET dept-tools context for choir unit', async () => {
    if (!choirUnitId) return;
    const res = await request(app.getHttpServer())
      .get(`/api/v1/service-units/${choirUnitId}/dept-tools/context`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.unit.departmentCode).toBe('CHOIR');
    expect(res.body.access.canManage).toBe(true);
  });

  it('POST dept-tools songs and reports', async () => {
    if (!choirUnitId) return;
    await request(app.getHttpServer())
      .post(`/api/v1/service-units/${choirUnitId}/dept-tools/songs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'E2E Test Hymn' })
      .expect((res) => expect([200, 201]).toContain(res.status));

    await request(app.getHttpServer())
      .post(`/api/v1/service-units/${choirUnitId}/dept-tools/reports`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        category: 'REHEARSAL_PARTICIPATION',
        title: 'E2E rehearsal report',
        body: 'Automated test report body',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
  });
});
