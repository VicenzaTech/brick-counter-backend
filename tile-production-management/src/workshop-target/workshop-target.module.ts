import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkshopTargetService } from './workshop-target.service';
import { WorkshopTargetController } from './workshop-target.controller';
import { WorkshopTarget } from './entities/workshop-target.entity';
import { Workshop } from 'src/workshops/entities/workshop.entity';
import { RedisModule } from 'src/common/redis/redis.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [WorkshopTargetController],
  providers: [WorkshopTargetService],
  imports: [TypeOrmModule.forFeature([WorkshopTarget, Workshop]), RedisModule, AuthModule],
})
export class WorkshopTargetModule {}
