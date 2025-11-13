/**
 * MQTT Service
 * Service để kết nối và xử lý messages từ MQTT broker
 * 
 * Tương tự mqtt_client.py trong old-vicenza-ims-web
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import { MessageQueueService } from '../common/queue/message-queue.service';
import { BoundedCacheService } from '../common/cache/bounded-cache.service';

interface MqttMessage {
  deviceId?: string;
  ts?: string;
  metrics?: {
    count?: number;
    err_count?: number;
  };
  quality?: {
    rssi?: number;
  };
  [key: string]: any;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private connected = false;
  private reconnectCount = 0;
  private readonly maxReconnectAttempts = 10;

  // Các topic cần subscribe theo MQTT rules
  private readonly topics = [
    'devices/+/telemetry',
    'devices/+/event',
    'devices/+/health',
    'devices/+/state',
    'devices/+/resp',
    'devices/+/status',
    'broadcast/+/resp', // Phản hồi lệnh điều khiển
    'broadcast/+/confirm', // Xác nhận cuối cùng từ server
  ];

  // Handlers registry - các module khác sẽ đăng ký handlers vào đây
  private telemetryHandlers: Map<
    string,
    (deviceId: string, data: MqttMessage) => Promise<void>
  > = new Map();
  
  private healthHandlers: Map<
    string,
    (deviceId: string, data: MqttMessage) => Promise<void>
  > = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly messageQueue: MessageQueueService,
    private readonly deviceCache: BoundedCacheService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.disconnect();
  }

  /**
   * Kết nối đến MQTT broker
   */
  async connect(): Promise<void> {
    try {
      const host = this.configService.get<string>('MQTT_HOST', 'localhost');
      const port = this.configService.get<number>('MQTT_PORT', 1883);
      const username = this.configService.get<string>('MQTT_USERNAME', '');
      const password = this.configService.get<string>('MQTT_PASSWORD', '');

      const brokerUrl = `mqtt://${host}:${port}`;

      this.client = mqtt.connect(brokerUrl, {
        username,
        password,
        keepalive: 60,
        reconnectPeriod: 5000,
        clean: true,
      });

      this.client.on('connect', () => this.onConnect());
      this.client.on('disconnect', () => this.onDisconnect());
      this.client.on('message', (topic, payload) =>
        this.onMessage(topic, payload),
      );
      this.client.on('error', (error) => this.onError(error));

      this.logger.log(`Đang kết nối đến MQTT broker: ${brokerUrl}`);
    } catch (error) {
      this.logger.error(`Lỗi kết nối MQTT: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ngắt kết nối MQTT
   */
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.connected = false;
      this.logger.log('Đã ngắt kết nối MQTT');
    }
  }

  /**
   * Callback khi kết nối thành công
   */
  private onConnect(): void {
    this.connected = true;
    this.reconnectCount = 0;
    this.logger.log('Kết nối MQTT thành công!');

    // Subscribe vào các topics
    this.topics.forEach((topic) => {
      this.client.subscribe(topic, (error) => {
        if (error) {
          this.logger.error(`Lỗi subscribe topic ${topic}: ${error.message}`);
        } else {
          this.logger.log(`Đã subscribe topic: ${topic}`);
        }
      });
    });
  }

  /**
   * Callback khi ngắt kết nối
   */
  private onDisconnect(): void {
    this.connected = false;
    this.logger.warn('Mất kết nối MQTT');
  }

  /**
   * Callback khi có lỗi
   */
  private onError(error: Error): void {
    this.logger.error(`MQTT Error: ${error.message}`, error.stack);
  }

  /**
   * Callback khi nhận message
   */
  private async onMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const payloadStr = payload.toString('utf-8');
      await this.processMessage(topic, payloadStr);
    } catch (error) {
      this.logger.error(`Lỗi xử lý message: ${error.message}`, error.stack);
    }
  }

  /**
   * Xử lý message nhận được từ MQTT
   */
  private async processMessage(topic: string, payload: string): Promise<void> {
    try {
      // Parse topic để lấy device_id và message_type
      // Topic format: devices/{deviceId}/{messageType} hoặc broadcast/{scope}/{messageType}
      const topicParts = topic.split('/');

      if (topicParts.length === 3 && topicParts[0] === 'devices') {
        // Format: devices/{deviceId}/{messageType}
        const deviceIdFromTopic = topicParts[1];
        const messageType = topicParts[2];
        await this.processDeviceMessage(deviceIdFromTopic, messageType, payload);
      } else if (topicParts.length === 3 && topicParts[0] === 'broadcast') {
        // Format: broadcast/{scope}/{messageType}
        const scope = topicParts[1];
        const messageType = topicParts[2];
        await this.processBroadcastMessage(scope, messageType, payload);
      } else {
        this.logger.warn(`Topic không hợp lệ: ${topic}`);
      }
    } catch (error) {
      this.logger.error(`Lỗi xử lý message: ${error.message}`, error.stack);
    }
  }

  /**
   * Xử lý message từ device cụ thể
   */
  private async processDeviceMessage(
    deviceId: string,
    messageType: string,
    payload: string,
  ): Promise<void> {
    try {
      // Parse JSON payload
      let messageData: MqttMessage;
      try {
        messageData = JSON.parse(payload);
      } catch (error) {
        this.logger.error(`Lỗi parse JSON: ${error.message}`);
        return;
      }

      // Kiểm tra device_id trong payload (nếu có)
      const deviceIdFromPayload = messageData.deviceId;

      // Kiểm tra device_id trong topic và payload có trùng nhau không
      if (deviceIdFromPayload && deviceIdFromPayload !== deviceId) {
        this.logger.warn(
          `Device ID không khớp - Topic: ${deviceId}, Payload: ${deviceIdFromPayload}`,
        );
        return;
      }

      // Lấy timestamp từ message hoặc dùng current time
      let timestamp = Date.now();
      if (messageData.ts) {
        try {
          const dt = new Date(messageData.ts);
          timestamp = dt.getTime();
        } catch {
          // Use current timestamp
        }
      }

      // Dispatch đến các handlers
      await this.dispatchToHandlers(deviceId, messageType, messageData, timestamp);
    } catch (error) {
      this.logger.error(
        `Lỗi xử lý message từ device ${deviceId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Dispatch message đến các handlers với message queue
   */
  private async dispatchToHandlers(
    deviceId: string,
    messageType: string,
    messageData: MqttMessage,
    timestamp: number,
  ): Promise<void> {
    // Xử lý telemetry messages
    if (messageType === 'telemetry') {
      // Process với tất cả telemetry handlers
      for (const [handlerName, handler] of this.telemetryHandlers) {
        try {
          await this.messageQueue.processOrdered(
            deviceId,
            timestamp,
            messageData,
            handler,
            `telemetry_${handlerName}`,
          );
        } catch (error) {
          this.logger.error(
            `Error dispatching telemetry to ${handlerName}: ${error.message}`,
            error.stack,
          );
        }
      }
    }

    // Xử lý health messages
    if (messageType === 'health') {
      // Process với tất cả health handlers
      for (const [handlerName, handler] of this.healthHandlers) {
        try {
          await this.messageQueue.processWithLock(
            deviceId,
            messageData,
            handler,
            `health_${handlerName}`,
          );
        } catch (error) {
          this.logger.error(
            `Error dispatching health to ${handlerName}: ${error.message}`,
            error.stack,
          );
        }
      }
    }
  }

  /**
   * Xử lý message từ broadcast topic
   */
  private async processBroadcastMessage(
    scope: string,
    messageType: string,
    payload: string,
  ): Promise<void> {
    try {
      // Parse JSON payload
      let messageData: MqttMessage;
      try {
        messageData = JSON.parse(payload);
      } catch (error) {
        this.logger.error(`Lỗi parse JSON: ${error.message}`);
        return;
      }

      if (messageType === 'resp') {
        // Xử lý phản hồi lệnh điều khiển
        const deviceId = messageData.deviceId || 'unknown';
        this.logger.log(
          `Đã xử lý phản hồi lệnh từ broadcast/${scope}/resp cho device ${deviceId}`,
        );
      } else if (messageType === 'confirm') {
        // Xử lý xác nhận cuối cùng từ server
        const cmdId = messageData['cmdId'];
        if (cmdId) {
          this.logger.log(
            `Đã nhận xác nhận cuối cùng cho lệnh ${cmdId} từ broadcast/${scope}/confirm`,
          );
        } else {
          this.logger.warn(
            `Xác nhận cuối cùng không có cmdId từ broadcast/${scope}/confirm`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Lỗi xử lý broadcast message: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Gửi message đến MQTT broker với QoS level tùy chỉnh
   */
  publishMessage(
    topic: string,
    payload: any,
    options: { retain?: boolean; qos?: 0 | 1 | 2 } = {},
  ): boolean {
    if (!this.connected) {
      this.logger.error('MQTT chưa kết nối');
      return false;
    }

    try {
      const payloadStr = JSON.stringify(payload);
      const { retain = false, qos = 1 } = options;

      this.client.publish(topic, payloadStr, { qos, retain }, (error) => {
        if (error) {
          this.logger.error(`Lỗi gửi message: ${error.message}`);
        } else {
          this.logger.log(`Đã gửi message đến topic: ${topic} (QoS ${qos})`);
        }
      });

      return true;
    } catch (error) {
      this.logger.error(`Lỗi publish message: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Đăng ký telemetry handler
   */
  registerTelemetryHandler(
    name: string,
    handler: (deviceId: string, data: MqttMessage) => Promise<void>,
  ): void {
    this.telemetryHandlers.set(name, handler);
    this.logger.log(`Registered telemetry handler: ${name}`);
  }

  /**
   * Đăng ký health handler
   */
  registerHealthHandler(
    name: string,
    handler: (deviceId: string, data: MqttMessage) => Promise<void>,
  ): void {
    this.healthHandlers.set(name, handler);
    this.logger.log(`Registered health handler: ${name}`);
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  isConnected(): boolean {
    return this.connected;
  }
}
