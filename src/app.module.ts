// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProfileModule } from './profile/profile.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { SchoolService } from './school/school.service';
import { SchoolController } from './school/school.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, 
      },
    ]),
    PrismaModule,
    AuthModule,
    DashboardModule,
    ProfileModule,
    CloudinaryModule,
  ],
  controllers: [AppController, SchoolController], // Tambahkan ini
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    PrismaService,
    SchoolService,
  ],
})
export class AppModule { }