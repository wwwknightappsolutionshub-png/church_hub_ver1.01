import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useBodyParser('json', {
    limit: '12mb',
    verify: (req: import('express').Request, _res: import('express').Response, buf: Buffer) => {
      const url = req.originalUrl ?? '';
      if (url.includes('/wisdom365/webhooks/stripe')) {
        (req as import('express').Request & { rawBody?: Buffer }).rawBody = buf;
      }
    },
  });
  app.useBodyParser('urlencoded', { limit: '12mb', extended: true });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/v1/uploads/',
  });
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:8081',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Church_Hub API')
    .setDescription('Church community management platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  logger.log(`Church_Hub API running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
