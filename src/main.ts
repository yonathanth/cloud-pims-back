import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for gzip support
  });

  // Get the underlying Express instance to configure middleware
  const expressApp = app.getHttpAdapter().getInstance();
  
  // Configure raw body parser for sync routes - must be first middleware
  // This handles binary gzip data before NestJS processes it
  // Use 'verify' callback to preserve the raw buffer without any processing
  expressApp.use('/api/sync/period', express.raw({ 
    type: ['application/octet-stream', 'application/gzip', 'application/x-gzip', '*/*'],
    limit: '10mb',
    verify: (req: any, res: any, buf: Buffer, encoding: string) => {
      // CRITICAL: Preserve the raw binary buffer exactly as received
      // Don't let Express do any string conversion or processing
      req.rawBody = Buffer.from(buf); // Create a new buffer copy to ensure it's not modified
      req.body = Buffer.from(buf); // Also set body to the buffer
      // Log to verify we have valid gzip data
      if (buf.length >= 2) {
        const magic = buf.slice(0, 2);
        console.log(`📦 Raw body captured: ${buf.length} bytes, magic bytes: ${magic.toString('hex')} (${magic[0] === 0x1f && magic[1] === 0x8b ? '✅ Valid gzip' : '❌ Invalid gzip'})`);
      }
    }
  }));

  // Log all incoming requests
  app.use((req: any, res: any, next: any) => {
    console.log(`📥 ${req.method} ${req.url}`);
    if (req.headers['x-api-key']) {
      console.log(`   API Key: ${req.headers['x-api-key'].substring(0, 10)}...`);
    }
    next();
  });

  // Enable CORS for web app
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global exception filter for better error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      // Skip validation for sync routes (they use raw binary data)
      skipNullProperties: false,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('PIMS Cloud Analytics API')
    .setDescription(
      'Cloud API for receiving and serving analytics data from PIMS pharmacy system',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API key for LAN system authentication',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 64387;
  await app.listen(port);

  console.log(`🚀 Cloud Analytics API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}

bootstrap();

