/**
 * WebSocket Module
 * Module quản lý WebSocket gateway
 */
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketGatewayService } from './websocket.gateway';
import { DeviceTelemetry } from '../devices/entities/device-telemetry.entity';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([DeviceTelemetry])],
    providers: [WebSocketGatewayService],
    exports: [WebSocketGatewayService],
})
export class WebSocketModule { }