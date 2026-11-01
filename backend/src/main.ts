import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'OTP_SECRET']) {
    if (!process.env[key]) throw new Error(`Missing required environment variable ${key}`);
  }
  // Own body parsers: application photos need a larger limit than Nest's 100 kB default.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' })); // SSLCommerz posts form data
  app.use(helmet());
  app.enableCors({ origin: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean), credentials: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }));
  app.setGlobalPrefix('v1', { exclude: ['payments/(.*)'] });
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  Logger.log(`MaaCrave API listening on :${port}`, 'Bootstrap');
}
bootstrap();
