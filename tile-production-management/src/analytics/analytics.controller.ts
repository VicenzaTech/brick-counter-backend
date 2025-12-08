import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsSubscriberService } from './analytics-subscriber.service';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('analytics')
@UseGuards(AuthGuard, PermissionGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsSubscriberService,
  ) {}

  /**
   * Get all production lines metrics
   */
  @Get('lines')
  @Permission(PERMISSIONS.ANALYTICS_READ)
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
  @Permission(PERMISSIONS.ANALYTICS_READ)
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
  @Permission(PERMISSIONS.ANALYTICS_READ)
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
  @Permission(PERMISSIONS.ANALYTICS_READ)
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
