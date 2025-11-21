/**
 * Simple Universal WebSocket Module
 * Module đơn giản - tạo namespace động cho mọi cluster
 */
import { Module, Global } from '@nestjs/common';

// Services & Gateways
import { SimpleUniversalWebSocketService } from './services/simple-universal-websocket.service';
import { SimpleUniversalWebSocketGateway } from './simple-universal-websocket.gateway';

// Import handler
import { SimpleUniversalMqttModule } from '../mqtt/simple-universal-mqtt.module';

@Global()
@Module({
  imports: [
    SimpleUniversalMqttModule, // Need handler for gateway registration
  ],
  providers: [
    SimpleUniversalWebSocketService,
    SimpleUniversalWebSocketGateway,
  ],
  exports: [
    SimpleUniversalWebSocketService,
  ],
})
export class SimpleUniversalWebSocketModule {}
