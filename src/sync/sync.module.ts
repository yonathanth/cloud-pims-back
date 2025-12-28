import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [AnalyticsModule, SalesModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}


