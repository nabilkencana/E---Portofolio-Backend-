// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('E-Portfolio API')
    .setDescription('API untuk E-Portfolio Pendidik Indonesia')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // CORS Configuration
  const allowedOrigins = [
    // Development origins
    'http://localhost:5173', // Vite default port
    'http://localhost:5174', // Vite alternate port
    'http://localhost:5175',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:8080',

    // Production origins (tambahkan nanti saat deploy)
    process.env.FRONTEND_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN,
  ].filter(Boolean);

  logger.log(`Allowed origins for CORS: ${JSON.stringify(allowedOrigins)}`);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // In development, allow all origins for easier testing
      if (!isProduction) {
        callback(null, origin);
        return;
      }

      // Check if the origin is allowed
      if (allowedOrigins.some(allowedOrigin =>
        origin === allowedOrigin ||
        origin.startsWith(allowedOrigin) ||
        allowedOrigin === '*'
      )) {
        callback(null, origin);
      } else {
        logger.warn(`Blocked CORS request from origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Authorization', 'Set-Cookie'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Cookie parser dengan settings yang benar
  app.use(cookieParser.default());

  // Cookie configuration middleware
  app.use((req: any, res: any, next: any) => {
    // Set secure cookie settings
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'Set-Cookie');
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints
            ? error.constraints[Object.keys(error.constraints)[0]]
            : 'Validation error',
        }));
        return new BadRequestException(result);
      },
    }),
  );

  // Global prefix untuk API routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
  logger.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  logger.log(`🔧 Environment: ${isProduction ? 'Production' : 'Development'}`);
  logger.log(`🍪 Cookies: ${isProduction ? 'Secure' : 'Lax'}`);
}
bootstrap();