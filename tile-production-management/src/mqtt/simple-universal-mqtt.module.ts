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
import { MqttController } from './mqtt.controller';
import { MeasurementModule } from '../measurement/measurement.module';
import { Measurement } from '../measurement/entities/measurement.entity';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Device, Measurement]),
    MeasurementModule,
  ],
  providers: [
    SimpleUniversalHandler,
    SimpleUniversalMqttService,
  ],
  controllers: [
    MqttController
  ],
  exports: [
    SimpleUniversalHandler,
    SimpleUniversalMqttService,
  ],
})
export class SimpleUniversalMqttModule {}
