import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionLineRun } from './entities/production-line-run.entity';
import { ProductionLineRunsService } from './production-line-runs.service';
import { ProductionLineRunsController } from './production-line-runs.controller';

@Module({
    imports: [TypeOrmModule.forFeature([ProductionLineRun])],
    controllers: [ProductionLineRunsController],
    providers: [ProductionLineRunsService],
    exports: [ProductionLineRunsService],
})
export class ProductionLineRunsModule { }
