import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { SyncModule } from './sync/sync.module';
import { SalesModule } from './sales/sales.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    AnalyticsModule,
    PharmacyModule,
    ApiKeyModule,
    SyncModule,
    SalesModule,
  ],
})
export class AppModule {}

