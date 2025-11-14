import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesMqttHandler } from './devices-mqtt.handler';
import { Device } from './entities/device.entity';
import { DeviceTelemetry } from './entities/device-telemetry.entity';
import { Position } from '../positions/entities/position.entity';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceTelemetry, Position]),
    WebSocketModule,
  ],
  providers: [DevicesService, DevicesMqttHandler],
  controllers: [DevicesController],
  exports: [DevicesMqttHandler],
})
export class DevicesModule {}
