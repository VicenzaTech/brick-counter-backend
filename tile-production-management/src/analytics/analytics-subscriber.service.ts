import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface DeviceAnalytics {
  deviceId: string;
  productionLine: string;
  position: string;
  currentCount: number;
  lastUpdate: string;
  speedPerMinute: number;
  speedPerHour: number;
  totalProducedToday: number;
  totalProducedLastHour: number;
  totalProducedLast10Min: number;
  isRunning: boolean;
  idleTimeSeconds: number;
  uptimeSeconds: number;
  trend: 'increasing' | 'stable' | 'decreasing' | 'stopped';
  efficiencyPercent?: number;
}

export interface LineAnalytics {
  productionLine: string;
  totalDevices: number;
  runningDevices: number;
  stoppedDevices: number;
  totalProducedToday: number;
  averageSpeedPerHour: number;
  devices: DeviceAnalytics[];
}

export interface AggregateAnalytics {
  totalLines: number;
  totalRunningDevices: number;
  totalProducedToday: number;
  timestamp: string;
}

@Injectable()
export class AnalyticsSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsSubscriberService.name);
  private subscriber: Redis;
  
  // Cache latest metrics
  private lineMetrics: Map<string, LineAnalytics> = new Map();
  private aggregateMetrics: AggregateAnalytics | null = null;

  async onModuleInit() {
    this.subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    // Subscribe to analytics channels
    await this.subscriber.subscribe('analytics:aggregate');
    await this.subscriber.psubscribe('analytics:line:*');

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handleMessage(channel, message);
    });

    this.logger.log('✅ Subscribed to analytics channels');
  }

  private handleMessage(channel: string, message: string) {
    try {
      const data = JSON.parse(message);

      if (channel === 'analytics:aggregate') {
        this.aggregateMetrics = data;
        this.logger.debug(`📊 Aggregate metrics updated`);
      } else if (channel.startsWith('analytics:line:')) {
        const lineName = channel.replace('analytics:line:', '');
        this.lineMetrics.set(lineName, data);
        this.logger.debug(`📊 Line metrics updated: ${lineName}`);
      }
    } catch (error) {
      this.logger.error(`Error parsing analytics message: ${error.message}`);
    }
  }

  /**
   * Get metrics for specific production line
   */
  getLineMetrics(lineName: string): LineAnalytics | null {
    return this.lineMetrics.get(lineName) || null;
  }

  /**
   * Get metrics for all production lines
   */
  getAllLineMetrics(): LineAnalytics[] {
    return Array.from(this.lineMetrics.values());
  }

  /**
   * Get aggregate metrics
   */
  getAggregateMetrics(): AggregateAnalytics | null {
    return this.aggregateMetrics;
  }

  /**
   * Get metrics for specific device
   */
  getDeviceMetrics(deviceId: string): DeviceAnalytics | null {
    for (const lineMetrics of this.lineMetrics.values()) {
      const device = lineMetrics.devices.find(d => d.deviceId === deviceId);
      if (device) {
        return device;
      }
    }
    return null;
  }
}
