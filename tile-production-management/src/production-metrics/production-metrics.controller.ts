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
} from '@nestjs/common';
import { ProductionMetricsService } from './production-metrics.service';
import {
  CreateProductionMetricDto,
  UpdateProductionMetricDto,
  MetricsAnalyticsDto,
} from './dtos/production-metric.dto';

@Controller('production-metrics')
export class ProductionMetricsController {
  constructor(private readonly metricsService: ProductionMetricsService) {}

  @Post()
  create(@Body() createDto: CreateProductionMetricDto) {
    return this.metricsService.create(createDto);
  }

  @Get()
  findAll(@Query() query: MetricsAnalyticsDto) {
    return this.metricsService.findAll(query);
  }

  @Get('summary')
  getSummary(@Query() query: MetricsAnalyticsDto) {
    return this.metricsService.getMetricsSummary(query);
  }

  @Get('daily-breakdown')
  getDailyBreakdown(@Query() query: MetricsAnalyticsDto) {
    return this.metricsService.getDailyBreakdown(query);
  }

  @Get('sankey')
  getSankeyData(@Query() query: MetricsAnalyticsDto) {
    return this.metricsService.getSankeyData(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.metricsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductionMetricDto,
  ) {
    return this.metricsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.metricsService.remove(id);
  }
}
