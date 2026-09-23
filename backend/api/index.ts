import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from '../dist/app.module';
import { HttpExceptionFilter } from '../dist/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../dist/common/interceptors/logging.interceptor';
import { ExpressAdapter } from '@nestjs/platform-express';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import express, { Express, Request, Response } from 'express';

let cachedServer: Express;

async function bootstrapServer(): Promise<Express> {
  const server = express();
  const adapter = new ExpressAdapter(server);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['log', 'warn', 'error'],
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'Cache-Control',
      'Pragma',
      'Accept',
      'Origin',
    ],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Root welcome & /health shortcut
  server.get('/', (_req, res) => {
    res.json({
      name: 'EstimateOS API',
      status: 'ok',
      health: '/api/v1/health',
      timestamp: new Date().toISOString(),
    });
  });

  server.get('/health', (_req, res) => {
    res.redirect(301, '/api/v1/health');
  });

  await app.init();

  try {
    const conn = app.get<Connection>(getConnectionToken());
    if (conn && conn.readyState !== 1) {
      await Promise.race([
        conn.asPromise(),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    }
  } catch (err) {
    console.warn('MongoDB connection warm-up:', err);
  }

  return server;
}

export default async function handler(req: Request, res: Response) {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return cachedServer(req, res);
}
