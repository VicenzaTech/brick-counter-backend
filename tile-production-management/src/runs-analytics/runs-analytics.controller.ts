import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { RunsAnalyticsService } from './runs-analytics.service';
import { RunsAnalyticsQueryDto } from './dtos/runs-analytics-query.dto';

@Controller('runs-analytics')
@UseGuards(AuthGuard, PermissionGuard)
export class RunsAnalyticsController {
    constructor(private readonly runsAnalyticsService: RunsAnalyticsService) { }

    @Get()
    @Permission(PERMISSIONS.ANALYTICS_READ)
    getRunsAnalytics(@Query() query: RunsAnalyticsQueryDto) {
        return this.runsAnalyticsService.getRunsAnalytics(query);
    }
}
