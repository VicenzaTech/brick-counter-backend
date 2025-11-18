import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AnalyticsSubscriberService } from './analytics-subscriber.service';
import { Redis } from 'ioredis';

@WebSocketGateway({
  namespace: 'analytics',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class AnalyticsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalyticsGateway.name);
  private subscriber: Redis;

  constructor(private readonly analyticsService: AnalyticsSubscriberService) {}

  async onModuleInit() {
    // Subscribe to Redis and broadcast to WebSocket clients
    this.subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    await this.subscriber.subscribe('analytics:aggregate');
    await this.subscriber.psubscribe('analytics:line:*');

    this.subscriber.on('message', (channel, message) => {
      this.broadcastAnalytics(channel, message);
    });

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.broadcastAnalytics(channel, message);
    });

    this.logger.log('✅ Analytics WebSocket Gateway initialized');
  }

  private broadcastAnalytics(channel: string, message: string) {
    try {
      const data = JSON.parse(message);

      if (channel === 'analytics:aggregate') {
        this.server.emit('aggregate-update', data);
      } else if (channel.startsWith('analytics:line:')) {
        const lineName = channel.replace('analytics:line:', '');
        this.server.emit('line-update', { lineName, data });
        
        // Also emit device updates
        data.devices?.forEach((device: any) => {
          this.server.emit('device-update', device);
        });
      }
    } catch (error) {
      this.logger.error(`Error broadcasting analytics: ${error.message}`);
    }
  }

  afterInit(server: Server) {
    this.logger.log('Analytics WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to analytics: ${client.id}`);
    
    // Send current metrics to new client
    const allLines = this.analyticsService.getAllLineMetrics();
    const aggregate = this.analyticsService.getAggregateMetrics();
    
    if (aggregate) {
      client.emit('aggregate-update', aggregate);
    }
    
    allLines.forEach((lineMetrics) => {
      client.emit('line-update', {
        lineName: lineMetrics.productionLine,
        data: lineMetrics,
      });
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from analytics: ${client.id}`);
  }
}
