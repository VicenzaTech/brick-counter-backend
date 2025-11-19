import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesMqttHandler } from './devices-mqtt.handler';
import { TelemetryLoggingService } from './services/telemetry-logging.service';
import { Device } from './entities/device.entity';
import { DeviceTelemetry } from './entities/device-telemetry.entity';
import { DeviceTelemetryLog } from './entities/device-telemetry-log.entity';
import { Position } from '../positions/entities/position.entity';
import { BrickType } from '../brick-types/entities/brick-type.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { JwtService } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceTelemetry, DeviceTelemetryLog, Position, BrickType]),
    WebSocketModule, UsersModule
  ],
  providers: [DevicesService, DevicesMqttHandler, TelemetryLoggingService, JwtService],
  controllers: [DevicesController],
  exports: [DevicesMqttHandler, TelemetryLoggingService],
})
export class DevicesModule {}
