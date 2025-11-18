import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsSubscriberService } from './analytics-subscriber.service';
import { AnalyticsGateway } from './analytics.gateway';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsSubscriberService, AnalyticsGateway],
  exports: [AnalyticsSubscriberService],
})
export class AnalyticsModule {}
