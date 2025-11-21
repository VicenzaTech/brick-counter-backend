import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Measurement } from './entities/measurement.entity';
import { Device } from 'src/devices/entities/device.entity';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import { MeasurementType } from 'src/measurement-types/entities/measurement-types.entity';
import { MeasurementService } from './measurement.service';
import { RedisModule } from 'src/common/redis/redis.module';

@Module({
    imports: [TypeOrmModule.forFeature([Measurement, Device, DeviceCluster, MeasurementType]), RedisModule],
    providers: [MeasurementService],
    exports: [MeasurementService],
})
export class MeasurementModule { }
