import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RunsAnalyticsService } from './runs-analytics.service';
import { RunsAnalyticsController } from './runs-analytics.controller';
import { ProductionLineRunsModule } from 'src/production-line-runs/production-line-runs.module';
import { ProductionLine } from 'src/production-lines/entities/production-line.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [ProductionLineRunsModule, TypeOrmModule.forFeature([ProductionLine]), AuthModule],
    providers: [RunsAnalyticsService],
    controllers: [RunsAnalyticsController],
})
export class RunsAnalyticsModule { }
