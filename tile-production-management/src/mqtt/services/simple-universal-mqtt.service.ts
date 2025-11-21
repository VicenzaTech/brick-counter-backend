/**
 * Simple Universal MQTT Service - FIXED EVENT ORDER
 * Register event listeners BEFORE subscribing
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
  private messageCount = 0;

  private clusters = ['BR', 'TEMP', 'HM'];

  constructor(
    private readonly configService: ConfigService,
    private readonly handler: SimpleUniversalHandler,
  ) {
    this.logger.log('🎬 Constructor called');
  }

  async onModuleInit() {
    this.logger.log('🎬 onModuleInit() called');
    await this.connect();
  }

  async onModuleDestroy() {
    this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
    //   const host = this.configService.get<string>('MQTT_HOST', '192.168.221.4');
      const host = "192.168.221.4"
      const port = this.configService.get<number>('MQTT_PORT', 1883);
      const username = this.configService.get<string>('MQTT_USERNAME', '');
      const password = this.configService.get<string>('MQTT_PASSWORD', '');

      const brokerUrl = `mqtt://${host}:${port}`;
      this.logger.log(`🔌 Connecting to: ${brokerUrl}`);

      this.client = mqtt.connect(brokerUrl, {
        username,
        password,
        keepalive: 60,
        reconnectPeriod: 5000,
        clean: true,
        clientId: `nestjs_${Math.random().toString(16).substr(2, 8)}`,
      });

      // ⭐ CRITICAL: Register ALL event listeners IMMEDIATELY after creating client
      this.logger.log('📝 Registering MQTT event listeners...');

      this.client.on('connect', () => {
        this.logger.log('🎉 EVENT: connect');
        this.onConnect();
      });

      this.client.on('disconnect', () => {
        this.logger.warn('⚠️ EVENT: disconnect');
        this.onDisconnect();
      });

      // ⭐⭐⭐ MOST IMPORTANT: Message event listener
      this.client.on('message', (topic: string, payload: Buffer) => {
        this.messageCount++;
        this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        this.logger.log(`📨 MQTT MESSAGE #${this.messageCount} RECEIVED!`);
        this.logger.log(`   Topic: ${topic}`);
        this.logger.log(`   Payload: ${payload.toString('utf-8').substring(0, 200)}`);
        this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        this.onMessage(topic, payload);
      });

      this.client.on('error', (error) => {
        this.logger.error('❌ EVENT: error', error);
        this.onError(error);
      });

      this.client.on('reconnect', () => {
        this.logger.warn('🔄 EVENT: reconnect');
      });

      this.client.on('offline', () => {
        this.logger.warn('📴 EVENT: offline');
      });

      this.client.on('close', () => {
        this.logger.warn('🚪 EVENT: close');
      });

      this.logger.log('✅ Event listeners registered');

      // Set MQTT client to handler
      this.handler.setMqttClient(this.client);

    } catch (error) {
      this.logger.error(`❌ Failed to connect: ${error.message}`, error.stack);
      throw error;
    }
  }

  private disconnect(): void {
    if (this.client) {
      this.client.end();
      this.connected = false;
      this.logger.log('Disconnected from MQTT');
    }
  }

  private onConnect(): void {
    this.connected = true;
    this.logger.log('✅ Connected to MQTT successfully!');

    // ⭐⭐⭐ CRITICAL: Test immediate message after connect
    this.logger.log('🧪 Testing immediate message...');
    setTimeout(() => {
      this.testMessageEvent();
    }, 1000);

    // Subscribe to wildcard topics
    const topics = [
      'devices/+/telemetry',
      'devices/+/status',
    ];

    this.logger.log(`📝 Subscribing to ${topics.length} topics...`);

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 0 }, (error, granted) => {
        if (error) {
          this.logger.error(`❌ Failed to subscribe to ${topic}: ${error.message}`);
        } else {
          this.logger.log(`✅ Subscribed to: ${topic}`);
          if (granted && granted.length > 0) {
            this.logger.log(`   QoS granted: ${granted[0].qos}`);
          }
        }
      });
    });

    this.logger.log(`📋 Subscribed to ${this.clusters.length} clusters: ${this.clusters.join(', ')}`);

    // Subscribe to ALL cluster topics
    this.clusters.forEach((cluster) => {
      this.client.subscribe(`devices/${cluster}/+/telemetry`, { qos: 0 }, (error, granted) => {
        if (error) {
          this.logger.error(`❌ Failed to subscribe to devices/${cluster}/+/telemetry: ${error.message}`);
        } else {
          this.logger.log(`✅ Subscribed to: devices/${cluster}/+/telemetry`);
        }
      });
      this.client.subscribe(`devices/${cluster}/+/status`, { qos: 0 }, (error, granted) => {
        if (error) {
          this.logger.error(`❌ Failed to subscribe to devices/${cluster}/+/status: ${error.message}`);
        } else {
          this.logger.log(`✅ Subscribed to: devices/${cluster}/+/status`);
        }
      });
    });
    // Thêm dòng này để nhận mọi thiết bị
    this.client.subscribe('devices/+/telemetry', { qos: 0 }, (error, granted) => {
      if (error) {
        this.logger.error(`❌ Failed to subscribe to devices/+/telemetry: ${error.message}`);
      } else {
        this.logger.log(`✅ Subscribed to: devices/+/telemetry`);
      }
    });

    // ⭐ Test: Log subscriptions after 2 seconds
    setTimeout(() => {
      this.logger.log('📊 Checking subscriptions status...');
      this.logger.log(`   Connected: ${this.connected}`);
      this.logger.log(`   Messages received: ${this.messageCount}`);
      this.logger.log(`   Client connected: ${this.client.connected}`);
      
      // Check if message listener is registered
      const messageListeners = this.client.listenerCount('message');
      this.logger.log(`   Message listeners count: ${messageListeners}`);
      
      if (messageListeners === 0) {
        this.logger.error('❌❌❌ NO MESSAGE LISTENER REGISTERED! This is the problem!');
      } else {
        this.logger.log(`✅ Message listener is active, waiting for messages...`);
      }
    }, 2000);
  }

  private onDisconnect(): void {
    this.connected = false;
    this.logger.warn('⚠️ Lost connection to MQTT');
  }

  private onError(error: Error): void {
    this.logger.error(`❌ MQTT Error: ${error.message}`);
    this.logger.error(error.stack);
  }

  private async onMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const payloadStr = payload.toString('utf-8');
      
      this.logger.log(`📥 Processing message...`);
      this.logger.log(`   Topic: ${topic}`);
      this.logger.log(`   Raw payload: ${payloadStr}`);

      // Parse JSON
      let message: any;
      try {
        message = JSON.parse(payloadStr);
      } catch (error) {
        this.logger.error(`❌ JSON parse failed: ${error.message}`);
        this.logger.error(`   Raw: ${payloadStr}`);
        return;
      }

      this.logger.log(`   Parsed:`, JSON.stringify(message, null, 2));

      // Route to handler
      if (topic.endsWith('/telemetry')) {
        this.logger.log(`   ➡️ Routing to handleTelemetry()`);
        await this.handler.handleTelemetry(topic, message);
      } else if (topic.endsWith('/status')) {
        this.logger.log(`   ➡️ Routing to handleStatus()`);
        await this.handler.handleStatus(topic, message);
      } else {
        this.logger.warn(`   ⚠️ Unknown topic pattern: ${topic}`);
      }

    } catch (error) {
      this.logger.error(`❌ Error in onMessage: ${error.message}`, error.stack);
    }
  }

  addCluster(clusterCode: string): void {
    if (!this.clusters.includes(clusterCode)) {
      this.clusters.push(clusterCode);
      
      if (this.connected) {
        this.client.subscribe(`devices/${clusterCode}/+/telemetry`, { qos: 0 });
        this.client.subscribe(`devices/${clusterCode}/+/status`, { qos: 0 });
      }
      
      this.logger.log(`➕ Added cluster: ${clusterCode}`);
    }
  }

  async publishCommand(clusterCode: string, deviceId: string, command: any): Promise<void> {
    await this.handler.publishCommand(clusterCode, deviceId, command);
  }

  async broadcastCommand(clusterCode: string, command: any): Promise<void> {
    await this.handler.broadcastCommand(clusterCode, command);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClusters(): string[] {
    return this.clusters;
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  // ⭐ Test method để publish real message ra broker
  testMessageEvent(): void {
    this.logger.log('🧪 Publishing test message to broker...');
    
    const testMessage = {
      test: true,
      timestamp: new Date().toISOString(),
      source: 'NestJS Backend',
      messageCount: this.messageCount
    };
    
    const topic = 'devices/TRUOC-MM-01/telemetry';
    const payload = JSON.stringify(testMessage);
    
    this.logger.log(`📤 Publishing to topic: ${topic}`);
    this.logger.log(`   Payload: ${payload}`);
    
    this.client.publish(topic, payload, { qos: 0, retain: false }, (error) => {
      if (error) {
        this.logger.error(`❌ Failed to publish test message: ${error.message}`);
      } else {
        this.logger.log(`✅ Test message published successfully`);
        this.logger.log(`   MQTTX should receive this message!`);
      }
    });
  }
}