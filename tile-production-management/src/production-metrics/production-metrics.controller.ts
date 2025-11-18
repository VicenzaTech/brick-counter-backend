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

@Controller('production-metrics')
@UseGuards(AuthGuard, PermissionGuard)
export class ProductionMetricsController {
    constructor(private readonly metricsService: ProductionMetricsService) { }

    @Post()
    @Permission(PERMISSIONS.PRODUCTION_METRIC_CREATE)
    create(@Body() createDto: CreateProductionMetricDto) {
        return this.metricsService.create(createDto);
    }

    @Get()
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    findAll(@Query() query: MetricsAnalyticsDto) {
        return this.metricsService.findAll(query);
    }

    @Get('summary')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    getSummary(@Query() query: MetricsAnalyticsDto) {
        return this.metricsService.getMetricsSummary(query);
    }

    @Get('daily-breakdown')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    getDailyBreakdown(@Query() query: MetricsAnalyticsDto) {
        return this.metricsService.getDailyBreakdown(query);
    }

    @Get('sankey')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    getSankeyData(@Query() query: MetricsAnalyticsDto) {
        return this.metricsService.getSankeyData(query);
    }

    @Get(':id')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_READ)
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.metricsService.findOne(id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_UPDATE)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateProductionMetricDto,
    ) {
        return this.metricsService.update(id, updateDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.PRODUCTION_METRIC_DELETE)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.metricsService.remove(id);
    }
}
