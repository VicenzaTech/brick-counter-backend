/**
 * Simple Universal MQTT Module
 * Module đơn giản - 1 handler cho tất cả, chỉ lưu raw data
 */
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Services & Handlers
import { SimpleUniversalMqttService } from './services/simple-universal-mqtt.service';
import { SimpleUniversalHandler } from './handlers/simple-universal.handler';

// Entities
import { Device } from '../devices/entities/device.entity';
// TODO: Add Measurement entity when table is ready

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Device]),
  ],
  providers: [
    SimpleUniversalHandler,
    SimpleUniversalMqttService,
  ],
  exports: [
    SimpleUniversalHandler,
    SimpleUniversalMqttService,
  ],
})
export class SimpleUniversalMqttModule {}
