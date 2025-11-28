import { Module } from '@nestjs/common';
import { ProductionStagesService } from './production-stages.service';
import { ProductionStagesController } from './production-stages.controller';

@Module({
  providers: [ProductionStagesService],
  controllers: [ProductionStagesController]
})
export class ProductionStagesModule {}
