import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionSummaryService } from './services/production-summary.service';
import { ProductionShiftSummary } from './entities/production-shift-summary.entity';
import { ProductionDailySummary } from './entities/production-daily-summary.entity';
import { DeviceTelemetryLog } from '../devices/entities/device-telemetry-log.entity';
import { Device } from '../devices/entities/device.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionShiftSummary,
      ProductionDailySummary,
      DeviceTelemetryLog,
      Device,
    ]),
  ],
  providers: [ProductionSummaryService],
  exports: [ProductionSummaryService],
})
export class ProductionSummariesModule {}
