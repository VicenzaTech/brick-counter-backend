import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_PROVIDER } from './redis.constant';

@Module({
    imports: [ConfigModule],
    providers: [
        // Redis client provider
        {
            provide: REDIS_PROVIDER,
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
    ],
    exports: [REDIS_PROVIDER]
})
export class RedisModule { }
