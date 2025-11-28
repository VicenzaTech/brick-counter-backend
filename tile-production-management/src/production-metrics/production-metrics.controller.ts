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
import { ProductionMetricsService } from './production-metrics.service';
import {
    CreateProductionMetricDto,
    UpdateProductionMetricDto,
    MetricsAnalyticsDto,
} from './dtos/production-metric.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { ActivityEntityType, ActivityAction } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('production-metrics')
@UseGuards(AuthGuard, PermissionGuard)
export class ProductionMetricsController {
    constructor(private readonly metricsService: ProductionMetricsService) { }

    @Post()
    @Permission(PERMISSIONS.PRODUCTION_METRIC_CREATE)
    async create(@Body() createDto: CreateProductionMetricDto): Promise<LoggedResponse<any>> {
        const metric = await this.metricsService.create(createDto);
        return {
            data: metric,
            log: {
                action: 'CREATE_PRODUCTION_METRIC' as ActivityAction,
                actionType: 'CREATE_PRODUCTION_METRIC' as ActivityAction,
                entityType: ActivityEntityType.ProductionMetric,
                description: 'Tạo cấu hình chỉ số sản xuất',
                entityId: (metric as any)?.id,
                entityName: undefined,
            },
        };
    }

    @Get()
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    async findAll(@Query() query: MetricsAnalyticsDto) {
        return this.metricsService.findAll(query);
    }

    @Get('summary')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    async getSummary(@Query() query: MetricsAnalyticsDto) {
        return this.metricsService.getMetricsSummary(query);
    }

    @Get('daily-breakdown')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    async getDailyBreakdown(@Query() query: MetricsAnalyticsDto) {
        return this.metricsService.getDailyBreakdown(query);
    }

    @Get('sankey')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    async getSankeyData(@Query() query: MetricsAnalyticsDto) {
        return this.metricsService.getSankeyData(query);
    }

    @Get(':id')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.metricsService.findOne(id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_UPDATE)
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateProductionMetricDto,
    ): Promise<LoggedResponse<any>> {
        return this.metricsService.update(id, updateDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_DELETE)
    async remove(@Param('id', ParseIntPipe) id: number): Promise<LoggedResponse<null>> {
        await this.metricsService.remove(id);
        return {
            data: null,
            log: {
                action: 'DELETE_PRODUCTION_METRIC' as ActivityAction,
                actionType: 'DELETE_PRODUCTION_METRIC' as ActivityAction,
                entityType: ActivityEntityType.ProductionMetric,
                description: `Xóa cấu hình chỉ số sản xuất id=${id}`,
                entityId: id,
                entityName: undefined,
            },
        };
    }
}

