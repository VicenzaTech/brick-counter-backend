import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeasurementTypesService } from './measurement-types.service';
import { MeasurementTypesController } from './measurement-types.controller';
import { MeasurementType } from './entities/measurement-types.entity';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([MeasurementType, DeviceCluster]), AuthModule],
  providers: [MeasurementTypesService],
  controllers: [MeasurementTypesController],
})
export class MeasurementTypesModule {}
