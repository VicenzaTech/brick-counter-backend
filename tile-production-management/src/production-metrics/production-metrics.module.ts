import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionMetricsController } from './production-metrics.controller';
import { ProductionMetricsService } from './production-metrics.service';
import { ProductionMetric } from './entities/production-metric.entity';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { BrickType } from '../brick-types/entities/brick-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductionMetric, ProductionLine, BrickType]),
  ],
  controllers: [ProductionMetricsController],
  providers: [ProductionMetricsService],
  exports: [ProductionMetricsService],
})
export class ProductionMetricsModule {}
