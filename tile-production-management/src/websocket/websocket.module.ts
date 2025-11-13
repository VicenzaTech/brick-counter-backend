/**
 * WebSocket Module
 * Module quản lý WebSocket gateway
 */
import { Module, Global } from '@nestjs/common';
import { WebSocketGatewayService } from './websocket.gateway';

@Global()
@Module({
  providers: [WebSocketGatewayService],
  exports: [WebSocketGatewayService],
})
export class WebSocketModule {}