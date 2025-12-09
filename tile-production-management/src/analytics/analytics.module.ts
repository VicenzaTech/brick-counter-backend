import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsSubscriberService } from './analytics-subscriber.service';
import { AnalyticsGateway } from './analytics.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsSubscriberService, AnalyticsGateway],
  imports: [AuthModule],
  exports: [AnalyticsSubscriberService],
})
export class AnalyticsModule {}
