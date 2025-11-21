import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';

import { Device } from './entities/device.entity';
import { DeviceTelemetry } from './entities/device-telemetry.entity';

import { Position } from '../positions/entities/position.entity';
import { BrickType } from '../brick-types/entities/brick-type.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { JwtService } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceTelemetry, Position, BrickType]),
    WebSocketModule, UsersModule
  ],
  providers: [DevicesService, JwtService],
  controllers: [DevicesController],
  exports: [DevicesService],
})
export class DevicesModule {}
