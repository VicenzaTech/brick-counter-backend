import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionsService } from './productions.service';
import { ProductionsController } from './productions.controller';
import { Production } from './entities/production.entity';
import { Device } from '../devices/entities/device.entity';
import { BrickType } from '../brick-types/entities/brick-type.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Production, Device, BrickType]), AuthModule],
  providers: [ProductionsService],
  controllers: [ProductionsController],
})
export class ProductionsModule {}
