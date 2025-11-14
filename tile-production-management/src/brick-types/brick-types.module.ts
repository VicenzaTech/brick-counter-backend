import { Module } from '@nestjs/common';
import { BrickTypesService } from './brick-types.service';
import { BrickTypesController } from './brick-types.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrickType } from './entities/brick-type.entity';
import { ProductionLine } from '../production-lines/entities/production-line.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BrickType, ProductionLine])],
  providers: [BrickTypesService],
  controllers: [BrickTypesController]
})
export class BrickTypesModule {}
