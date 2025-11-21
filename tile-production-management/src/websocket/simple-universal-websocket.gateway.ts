/**
 * Simple Universal WebSocket Gateway Adapter
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SimpleUniversalWebSocketService } from './services/simple-universal-websocket.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SimpleUniversalWebSocketGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SimpleUniversalWebSocketGateway.name);

  constructor(
    private readonly wsService: SimpleUniversalWebSocketService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('✅ Socket.IO server initialized');
    
    // Pass server to service
    this.wsService.setServer(server);
    
    const namespaces = this.wsService.getNamespaces();
    this.logger.log(`📡 Created ${namespaces.length} namespaces: ${namespaces.join(', ')}`);
  }
}
