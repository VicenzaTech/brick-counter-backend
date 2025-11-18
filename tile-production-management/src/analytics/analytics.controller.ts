import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsSubscriberService } from './analytics-subscriber.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsSubscriberService,
  ) {}

  /**
   * Get all production lines metrics
   */
  @Get('lines')
  getAllLines() {
    return {
      success: true,
      data: this.analyticsService.getAllLineMetrics(),
    };
  }

  /**
   * Get specific production line metrics
   */
  @Get('lines/:lineName')
  getLine(@Param('lineName') lineName: string) {
    const metrics = this.analyticsService.getLineMetrics(lineName);
    
    if (!metrics) {
      return {
        success: false,
        message: `No metrics found for line: ${lineName}`,
      };
    }

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get specific device metrics
   */
  @Get('devices/:deviceId')
  getDevice(@Param('deviceId') deviceId: string) {
    const metrics = this.analyticsService.getDeviceMetrics(deviceId);
    
    if (!metrics) {
      return {
        success: false,
        message: `No metrics found for device: ${deviceId}`,
      };
    }

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get aggregate metrics
   */
  @Get('aggregate')
  getAggregate() {
    const metrics = this.analyticsService.getAggregateMetrics();
    
    if (!metrics) {
      return {
        success: false,
        message: 'No aggregate metrics available',
      };
    }

    return {
      success: true,
      data: metrics,
    };
  }
}
