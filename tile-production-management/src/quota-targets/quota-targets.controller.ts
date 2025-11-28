import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { QuotaTargetsService } from './quota-targets.service';
import {
    CreateQuotaTargetDto,
    UpdateQuotaTargetDto,
    QuotaComparisonDto,
} from './dtos/quota-target.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { ActivityEntityType, ActivityAction } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('quota-targets')
@UseGuards(AuthGuard, PermissionGuard)
export class QuotaTargetsController {
    constructor(private readonly quotaService: QuotaTargetsService) { }

    @Post()
    @Permission(PERMISSIONS.QUOTA_TARGET_CREATE)
    async create(@Body() createDto: CreateQuotaTargetDto): Promise<LoggedResponse<any>> {
        const quota = await this.quotaService.create(createDto);
        return {
            data: quota,
            log: {
                action: 'CREATE_QUOTA_TARGET' as ActivityAction,
                actionType: 'CREATE_QUOTA_TARGET' as ActivityAction,
                entityType: ActivityEntityType.QuotaTarget,
                description: `Tạo chỉ tiêu sản lượng`,
                entityId: (quota as any)?.id,
                entityName: undefined,
            },
        };
    }

    @Get()
    @Permission(PERMISSIONS.QUOTA_TARGET_READ)
    async findAll() {
        return this.quotaService.findAll();
    }

    @Get('active')
    async findActive() {
        return this.quotaService.findActive();
    }

    @Get('brick-type/:brickTypeId')
    @Permission(PERMISSIONS.BRICK_TYPE_READ)
    async findByBrickType(@Param('brickTypeId', ParseIntPipe) brickTypeId: number) {
        return this.quotaService.findByBrickType(brickTypeId);
    }

    @Post('compare')
    @Permission(PERMISSIONS.QUOTA_TARGET_READ)
    async compareWithQuota(@Body() comparisonDto: QuotaComparisonDto) {
        return this.quotaService.compareWithQuota(comparisonDto);
    }

    @Get(':id')
    @Permission(PERMISSIONS.QUOTA_TARGET_READ)
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.quotaService.findOne(id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.QUOTA_TARGET_UPDATE)
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateQuotaTargetDto,
    ): Promise<LoggedResponse<any>> {
        const quota = await this.quotaService.update(id, updateDto);
        return {
            data: quota,
            log: {
                action: 'UPDATE_QUOTA_TARGET' as ActivityAction,
                actionType: 'UPDATE_QUOTA_TARGET' as ActivityAction,
                entityType: ActivityEntityType.QuotaTarget,
                description: `Cập nhật chỉ tiêu sản lượng id=${id}`,
                entityId: id,
                entityName: undefined,
            },
        };
    }

    @Delete(':id')
    @Permission(PERMISSIONS.QUOTA_TARGET_DELETE)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<LoggedResponse<null>> {
        await this.quotaService.remove(id);
        return {
            data: null,
            log: {
                action: 'DELETE_QUOTA_TARGET' as ActivityAction,
                actionType: 'DELETE_QUOTA_TARGET' as ActivityAction,
                entityType: ActivityEntityType.QuotaTarget,
                description: `Xoá chỉ tiêu sản lượng id=${id}`,
                entityId: id,
                entityName: undefined,
            },
        };
    }
}
