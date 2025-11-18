import { Module } from '@nestjs/common';
import { ProductionLinesService } from './production-lines.service';
import { ProductionLinesController } from './production-lines.controller';
import { ProductionLine } from './entities/production-line.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionLine, Workshop]), AuthModule],
  providers: [ProductionLinesService],
  controllers: [ProductionLinesController]
})
export class ProductionLinesModule {}
