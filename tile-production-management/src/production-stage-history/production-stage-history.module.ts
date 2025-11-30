import { Module } from '@nestjs/common';
import { ProductionStageHistoryService } from './production-stage-history.service';
import { ProductionStageHistoryController } from './production-stage-history.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionStageHistory } from './entities/production-stage-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionStageHistory])],
  providers: [ProductionStageHistoryService],
  controllers: [ProductionStageHistoryController]
})
export class ProductionStageHistoryModule {}
