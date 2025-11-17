import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workshop } from './workshops/entities/workshop.entity';
import { ProductionLine } from './production-lines/entities/production-line.entity';
import { Position } from './positions/entities/position.entity';
import { Device } from './devices/entities/device.entity';
import { DeviceTelemetry } from './devices/entities/device-telemetry.entity';
import { BrickType } from './brick-types/entities/brick-type.entity';
import { Production } from './productions/entities/production.entity';
import { ProductionSummary } from './production-summaries/entities/production-summary.entity';
import { MaintenanceLog } from './maintenance-logs/entities/maintenance-log.entity';
import { ProductionMetric } from './production-metrics/entities/production-metric.entity';
import { QuotaTarget } from './quota-targets/entities/quota-target.entity';
import { WorkshopsModule } from './workshops/workshops.module';
import { ProductionLinesModule } from './production-lines/production-lines.module';
import { PositionsModule } from './positions/positions.module';
import { DevicesModule } from './devices/devices.module';
import { ProductionsModule } from './productions/productions.module';
import { BrickTypesModule } from './brick-types/brick-types.module';
import { ProductionMetricsModule } from './production-metrics/production-metrics.module';
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

@Module({
  imports: [
    // Config module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TypeORM configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'brick-counter-dev',
      entities: [
        Workshop,
        ProductionLine,
        Position,
        Device,
        DeviceTelemetry,
        BrickType,
        Production,
        ProductionSummary,
        MaintenanceLog,
        ProductionMetric,
        QuotaTarget,
        User,
        Role,
        Permission
      ],
      synchronize: false, // false for production
    }),
    // MQTT and WebSocket modules
    MqttModule,
    WebSocketModule,
    // Feature modules
    WorkshopsModule,
    ProductionLinesModule,
    PositionsModule,
    DevicesModule,
    ProductionsModule,
    BrickTypesModule,
    ProductionMetricsModule,
    QuotaTargetsModule,
    UsersModule,
    HashModule,
    AuthModule,
    SessionModule,
    RedisModule,
  ],
  providers: [],
})
export class AppModule {}
