import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Workshop } from './workshops/entities/workshop.entity';
import { ProductionLine } from './production-lines/entities/production-line.entity';
import { Position } from './positions/entities/position.entity';
import { Device } from './devices/entities/device.entity';
import { DeviceTelemetry } from './devices/entities/device-telemetry.entity';

import { BrickType } from './brick-types/entities/brick-type.entity';
import { ProductionSummary } from './production-summaries/entities/production-summary.entity';
import { ProductionShiftSummary } from './production-summaries/entities/production-shift-summary.entity';
import { ProductionDailySummary } from './production-summaries/entities/production-daily-summary.entity';
import { ProductionMetric } from './production-metrics/entities/production-metric.entity';
import { QuotaTarget } from './quota-targets/entities/quota-target.entity';
import { WorkshopsModule } from './workshops/workshops.module';
import { ProductionLinesModule } from './production-lines/production-lines.module';
import { PositionsModule } from './positions/positions.module';
import { DevicesModule } from './devices/devices.module';
import { BrickTypesModule } from './brick-types/brick-types.module';
import { ProductionMetricsModule } from './production-metrics/production-metrics.module';
import { ProductionSummariesModule } from './production-summaries/production-summaries.module';
import { QuotaTargetsModule } from './quota-targets/quota-targets.module';
import { MqttModule } from './mqtt/mqtt.module';
import { WebSocketModule } from './websocket/websocket.module';
import { HashModule } from './common/hash/hash.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { RedisModule } from './common/redis/redis.module';
import { User } from './users/entities/user.entity';
import { Role } from './users/entities/role.entity';
import { Permission } from './users/entities/permission.entity';
import { AnalyticsModule } from './analytics/analytics.module';
import { PartitionManagerModule } from './partition-manager/partition-manager.module';
import { MeasurementModule } from './measurement/measurement.module';
import { Measurement } from './measurement/entities/measurement.entity';
import { DeviceCluster } from './device-clusters/entities/device-cluster.entity';
import { MeasurementType } from './measurement-types/entities/measurement-types.entity';
import { DeviceClustersModule } from './device-clusters/device-clusters.module';
import { MeasurementTypesModule } from './measurement-types/measurement-types.module';

@Module({
    imports: [
        // Config module for environment variables
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        // Schedule module for cron jobs
        ScheduleModule.forRoot(),
        // TypeORM configuration
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5450'),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || '123456',
            database: process.env.DB_NAME || 'brick-counter-dev',
            migrations: [__dirname + '/migrations/*{.ts,.js}'],
            entities: [
                Workshop,
                ProductionLine,
                Position,
                Device,
                DeviceTelemetry,
                BrickType,
                ProductionSummary,
                ProductionShiftSummary,
                ProductionDailySummary,
                ProductionMetric,
                QuotaTarget,
                User,
                Role,
                Permission,
                DeviceCluster,
                Measurement,
                MeasurementType,
            ],
            synchronize: true, // Set to true to auto-create tables (development/staging only)
            migrationsRun: true // Set to true when initial db
        }),
        // MQTT and WebSocket modules
        MqttModule,
        WebSocketModule,
        // Feature modules
        WorkshopsModule,
        ProductionLinesModule,
        PositionsModule,
        DevicesModule,
        BrickTypesModule,
        ProductionMetricsModule,
        ProductionSummariesModule,
        QuotaTargetsModule,
        UsersModule,
        HashModule,
        AuthModule,
        SessionModule,
        RedisModule,
        AnalyticsModule,
        PartitionManagerModule,
        MeasurementModule,
        DeviceClustersModule,
        MeasurementTypesModule
    ],
    providers: [],
})
export class AppModule { }
