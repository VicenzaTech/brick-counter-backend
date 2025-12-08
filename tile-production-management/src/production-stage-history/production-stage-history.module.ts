import { Module } from '@nestjs/common';
import { ProductionStageHistoryService } from './production-stage-history.service';
import { ProductionStageHistoryController } from './production-stage-history.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionStageHistory } from './entities/production-stage-history.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionStageHistory]), AuthModule],
  providers: [ProductionStageHistoryService],
  controllers: [ProductionStageHistoryController],
  exports: [ProductionStageHistoryService]
})
export class ProductionStageHistoryModule {}
