import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotaTargetsController } from './quota-targets.controller';
import { QuotaTargetsService } from './quota-targets.service';
import { QuotaTarget } from './entities/quota-target.entity';
import { BrickType } from '../brick-types/entities/brick-type.entity';
import { ProductionMetric } from '../production-metrics/entities/production-metric.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuotaTarget, BrickType, ProductionMetric]),
  ],
  controllers: [QuotaTargetsController],
  providers: [QuotaTargetsService],
  exports: [QuotaTargetsService],
})
export class QuotaTargetsModule {}
