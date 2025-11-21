import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceClustersService } from './device-clusters.service';
import { DeviceClustersController } from './device-clusters.controller';
import { DeviceCluster } from './entities/device-cluster.entity';
import { MeasurementType } from 'src/measurement-types/entities/measurement-types.entity';
import { AuthModule } from 'src/auth/auth.module';
import { ProductionLine } from 'src/production-lines/entities/production-line.entity';
import { Device } from 'src/devices/entities/device.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceCluster, MeasurementType, ProductionLine, Device]),
    AuthModule,
  ],
  providers: [DeviceClustersService],
  controllers: [DeviceClustersController],
})
export class DeviceClustersModule {}
