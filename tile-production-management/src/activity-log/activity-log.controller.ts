import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { Pagination_Helper } from 'src/common/type/pagination.type';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';

@Controller('activity-log')
export class ActivityLogController {
    constructor(private activityLogService: ActivityLogService) { }

    @Get()
    @UseGuards(AuthGuard)
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
