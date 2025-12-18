import { Module } from '@nestjs/common';
import { BrickTypesService } from './brick-types.service';
import { BrickTypesController } from './brick-types.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrickType } from './entities/brick-type.entity';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { ProductionMetric } from '../production-metrics/entities/production-metric.entity';
import { ProductionStageHistory } from '../production-stage-history/entities/production-stage-history.entity';
import { ProductionLineRun } from '../production-line-runs/entities/production-line-run.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            BrickType,
            ProductionLine,
            ProductionMetric,
            ProductionStageHistory,
            ProductionLineRun,
        ]),
        AuthModule
    ],
    providers: [BrickTypesService],
    controllers: [BrickTypesController]
})
export class BrickTypesModule { }
