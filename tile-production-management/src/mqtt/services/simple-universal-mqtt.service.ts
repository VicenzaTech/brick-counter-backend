/**
 * Simple Universal MQTT Service
 * 1 service xử lý MQTT cho MỌI cluster - chỉ lưu raw data
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import { SimpleUniversalHandler } from '../handlers/simple-universal.handler';

@Injectable()
export class SimpleUniversalMqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimpleUniversalMqttService.name);
  private client: MqttClient;
  private connected = false;

  // List of clusters to subscribe - có thể load từ DB hoặc hardcode
  private clusters = ['BR', 'TEMP', 'HM']; // Có thể thêm bao nhiêu cũng được

  constructor(
    private readonly configService: ConfigService,
    private readonly handler: SimpleUniversalHandler,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.disconnect();
  }

  /**
   * Connect to MQTT broker
   */
  private async connect(): Promise<void> {
    try {
      const host = this.configService.get<string>('MQTT_HOST', '192.168.221.4');
      const port = this.configService.get<number>('MQTT_PORT', 1883);
      const username = this.configService.get<string>('MQTT_USERNAME', '');
      const password = this.configService.get<string>('MQTT_PASSWORD', '');

      const brokerUrl = `mqtt://${host}:${port}`;

      this.logger.log(`🔌 Connecting to MQTT broker: ${brokerUrl}`);

      this.client = mqtt.connect(brokerUrl, {
        username,
        password,
        keepalive: 60,
        reconnectPeriod: 5000,
        clean: true,
        clientId: `nestjs_simple_${Math.random().toString(16).substr(2, 8)}`,
      });

      this.client.on('connect', () => this.onConnect());
      this.client.on('disconnect', () => this.onDisconnect());
      this.client.on('message', (topic, payload) => this.onMessage(topic, payload));
      this.client.on('error', (error) => this.onError(error));
      this.client.on('reconnect', () => {
        this.logger.warn('🔄 Reconnecting to MQTT...');
      });

      // Set MQTT client to handler
      this.handler.setMqttClient(this.client);

    } catch (error) {
      this.logger.error(`❌ Failed to connect to MQTT: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  private disconnect(): void {
    if (this.client) {
      this.client.end();
      this.connected = false;
      this.logger.log('Disconnected from MQTT');
    }
  }

  /**
   * On connect callback
   */
  private onConnect(): void {
    this.connected = true;
    this.logger.log('✅ Connected to MQTT successfully!');

    // Subscribe to ALL cluster topics
    this.clusters.forEach((cluster) => {
      this.subscribeToTopic(`devices/${cluster}/+/telemetry`);
      this.subscribeToTopic(`devices/${cluster}/+/status`);
    });

    this.logger.log(`📋 Subscribed to ${this.clusters.length} clusters: ${this.clusters.join(', ')}`);
  }

  /**
   * Subscribe to topic
   */
  private subscribeToTopic(topic: string): void {
    this.client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        this.logger.error(`❌ Failed to subscribe to ${topic}: ${error.message}`);
      } else {
        this.logger.log(`✅ Subscribed to: ${topic}`);
      }
    });
  }

  /**
   * On disconnect callback
   */
  private onDisconnect(): void {
    this.connected = false;
    this.logger.warn('⚠️ Lost connection to MQTT');
  }

  /**
   * On error callback
   */
  private onError(error: Error): void {
    this.logger.error(`❌ MQTT Error: ${error.message}`, error.stack);
  }

  /**
   * On message callback - route to handler
   */
  private async onMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const payloadStr = payload.toString('utf-8');
      
      this.logger.log(`📨 MQTT message: ${topic}`);
      this.logger.debug(`   Payload: ${payloadStr.substring(0, 200)}`);

      // Parse payload
      let message: any;
      try {
        message = JSON.parse(payloadStr);
      } catch (error) {
        this.logger.error(`Failed to parse JSON: ${error.message}`);
        return;
      }

      // Route based on message type (telemetry or status)
      if (topic.endsWith('/telemetry')) {
        await this.handler.handleTelemetry(topic, message);
      } else if (topic.endsWith('/status')) {
        await this.handler.handleStatus(topic, message);
      }

    } catch (error) {
      this.logger.error(`❌ Error processing message: ${error.message}`, error.stack);
    }
  }

  /**
   * Add cluster dynamically
   */
  addCluster(clusterCode: string): void {
    if (!this.clusters.includes(clusterCode)) {
      this.clusters.push(clusterCode);
      
      if (this.connected) {
        this.subscribeToTopic(`devices/${clusterCode}/+/telemetry`);
        this.subscribeToTopic(`devices/${clusterCode}/+/status`);
      }
      
      this.logger.log(`➕ Added cluster: ${clusterCode}`);
    }
  }

  /**
   * Publish command to device
   */
  async publishCommand(
    clusterCode: string,
    deviceId: string,
    command: any,
  ): Promise<void> {
    await this.handler.publishCommand(clusterCode, deviceId, command);
  }

  /**
   * Broadcast to cluster
   */
  async broadcastCommand(clusterCode: string, command: any): Promise<void> {
    await this.handler.broadcastCommand(clusterCode, command);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get registered clusters
   */
  getClusters(): string[] {
    return this.clusters;
  }
}
