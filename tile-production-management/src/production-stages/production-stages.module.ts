import { Module } from '@nestjs/common';
import { ProductionStagesService } from './production-stages.service';
import { ProductionStagesController } from './production-stages.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionStage } from './entities/production-stage.entity';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { Position } from '../positions/entities/position.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductionStage, ProductionLine, Position])
  ],
  controllers: [ProductionStagesController],
  providers: [ProductionStagesService],
  exports: [ProductionStagesService]
})
export class ProductionStagesModule {}
