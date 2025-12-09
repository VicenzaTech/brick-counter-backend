import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { Pagination_Helper } from 'src/common/type/pagination.type';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('activity-log')
@UseGuards(AuthGuard, PermissionGuard)
export class ActivityLogController {
    constructor(private activityLogService: ActivityLogService) { }

    @Get()
    @Permission(PERMISSIONS.ACTIVITY_LOG_READ)
    async findAll(
        @Query('actionType') actionType?: string,
        @Query('entityType') entityType?: string,
        @Query('userId') userId?: string,
        @Query('status') status?: 'SUCCESS' | 'FAILED',
        @Query('timestamp') timestamp?: '30day' | '24hour' | '7day' | 'all',
        @Query() query?: any,
    ) {
        const pagination = Pagination_Helper.extractDefaultFromQuery(query);
        return await this.activityLogService.findAll({
            ...pagination,
            actionType,
            entityType,
            userId,
            status,
            timestamp
        });
    }
}
