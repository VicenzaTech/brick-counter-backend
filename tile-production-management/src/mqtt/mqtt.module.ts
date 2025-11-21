/**
 * MQTT Module
 * Module quản lý MQTT service và các dependencies
 */
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import { MqttService } from './mqtt.service';
import { MqttController } from './mqtt.controller';
import { DeviceCommandController } from './controllers/device-command.controller';
import { DeviceCommandService } from './services/device-command.service';
import { MessageQueueService } from '../common/queue/message-queue.service';
import { BoundedCacheService } from '../common/cache/bounded-cache.service';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { DevicesModule } from '../devices/devices.module';

@Global()
@Module({
  imports: [ConfigModule, DevicesModule, TypeOrmModule.forFeature([ProductionLine])],
  controllers: [MqttController, DeviceCommandController],
  providers: [
    // Redis client provider
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD', '');

        const redis = new Redis({
          host,
          port,
          password: password || undefined,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        redis.on('connect', () => {
          console.log('Redis connected successfully');
        });

        redis.on('error', (error) => {
          console.error('Redis connection error:', error);
        });

        return redis;
      },
      inject: [ConfigService],
    },
    // Device cache provider
    {
      provide: BoundedCacheService,
      useFactory: () => {
        // max_size=100, ttl=1 hour
        return new BoundedCacheService(100, 3600000);
      },
    },
    MessageQueueService,
    MqttService,
    DeviceCommandService,
  ],
  exports: [MqttService, MessageQueueService, BoundedCacheService, 'REDIS_CLIENT', DeviceCommandService],
})
export class MqttModule {}
