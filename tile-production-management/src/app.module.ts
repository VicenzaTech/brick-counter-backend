import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workshop } from './workshops/entities/workshop.entity';
import { ProductionLine } from './production-lines/entities/production-line.entity';
import { Position } from './positions/entities/position.entity';
import { Device } from './devices/entities/device.entity';
import { BrickType } from './brick-types/entities/brick-type.entity';
import { Production } from './productions/entities/production.entity';
import { ProductionSummary } from './production-summaries/entities/production-summary.entity';
import { MaintenanceLog } from './maintenance-logs/entities/maintenance-log.entity';
import { WorkshopsModule } from './workshops/workshops.module';
import { ProductionLinesModule } from './production-lines/production-lines.module';
import { PositionsModule } from './positions/positions.module';
import { DevicesModule } from './devices/devices.module';
import { ProductionsModule } from './productions/productions.module';
import { BrickTypesModule } from './brick-types/brick-types.module';
import { MqttModule } from './mqtt/mqtt.module';
import { WebSocketModule } from './websocket/websocket.module';

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
        BrickType,
        Production,
        ProductionSummary,
        MaintenanceLog,
      ],
      synchronize: true, // false for production
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
  ],
})
export class AppModule {}
