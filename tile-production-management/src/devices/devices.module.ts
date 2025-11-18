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
import { WebSocketModule } from '../websocket/websocket.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceTelemetry, DeviceTelemetryLog, Position]),
    WebSocketModule, AuthModule
  ],
  providers: [DevicesService, DevicesMqttHandler, TelemetryLoggingService],
  controllers: [DevicesController],
  exports: [DevicesMqttHandler, TelemetryLoggingService],
})
export class DevicesModule {}
