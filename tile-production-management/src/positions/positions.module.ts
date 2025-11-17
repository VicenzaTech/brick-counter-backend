import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';
import { Position } from './entities/position.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Position]), AuthModule],
  providers: [PositionsService],
  controllers: [PositionsController],
})
export class PositionsModule {}
