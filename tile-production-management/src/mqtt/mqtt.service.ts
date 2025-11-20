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
import * as fs from 'fs';
import * as path from 'path';

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

<<<<<<< HEAD
    private healthHandlers: Map<
        string,
        (deviceId: string, data: MqttMessage) => Promise<void>
    > = new Map();
=======
  // Cache device -> production line mapping
  private deviceLineCache: Map<string, string> = new Map();
  
  // Cache device -> brick type mapping
  private deviceBrickTypeCache: Map<string, string> = new Map();
  
  // Cache last count per device to detect resets
  private lastCountCache: Map<string, number> = new Map();
  
  // Cache last logged count to detect if count changed (avoid logging duplicates)
  private lastLoggedCountCache: Map<string, number> = new Map();
>>>>>>> main

    // Cache device -> production line mapping
    private deviceLineCache: Map<string, string> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly messageQueue: MessageQueueService,
        private readonly deviceCache: BoundedCacheService,
    ) { }

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
            const host = "192.168.221.4";
            const port = 1883;
            const password = "";
            const username = "";

            const brokerUrl = `mqtt://${host}:${port}`;

<<<<<<< HEAD
            this.logger.log(`🔌 Đang kết nối đến MQTT broker: ${brokerUrl}`);
=======
  /**
   * Ghi log telemetry vào file theo ngày
   * Cấu trúc: logs/{YYYY-MM-DD}/{production-line}/{brick-type}/{device-position}/{deviceId}_timestamp.txt
   * 
   * Logic:
   * - Không ghi log nếu count không đổi (tránh spam khi dây chuyền dừng)
   * - Tạo file mới khi: reset, đổi dòng gạch, hoặc file đầu tiên của ngày
   */
  private async writeDeviceLog(
    deviceId: string,
    messageData: MqttMessage,
    timestamp: number,
  ): Promise<void> {
    try {
      const currentCount = messageData.metrics?.count;
      if (currentCount === undefined || currentCount === null) {
        return; // Skip if no count data
      }

      // Kiểm tra nếu count không đổi so với lần log trước → SKIP
      const lastLoggedCount = this.lastLoggedCountCache.get(deviceId);
      if (lastLoggedCount !== undefined && currentCount === lastLoggedCount) {
        this.logger.debug(`⏭️  Skip logging ${deviceId}: count unchanged (${currentCount})`);
        return; // Không ghi log khi count không đổi
      }

      // Lấy ngày hiện tại (YYYY-MM-DD)
      const date = new Date(timestamp);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Parse deviceId để lấy thông tin (ví dụ: SAU-ME-01)
      const deviceParts = deviceId.split('-');
      let devicePosition = deviceId.toLowerCase();
      
      // Tạo tên vị trí thiết bị
      if (deviceParts.length >= 2) {
        const position = deviceParts.slice(0, -1).join('-').toLowerCase(); // sau-me, truoc-ln, ...
        devicePosition = position;
      }
      
      // Lấy production line và brick type từ cache
      const productionLine = this.deviceLineCache.get(deviceId) || 'DC-01';
      const brickType = this.deviceBrickTypeCache.get(deviceId) || 'no-brick-type';
      
      // 🛑 DỪNG GHI LOG nếu đang tạm dừng sản xuất (activeBrickTypeId = null)
      if (brickType === 'no-brick-type') {
        this.logger.debug(`⏸️  Skip logging for ${deviceId}: production paused (no active brick type)`);
        return;
      }
      
      // Tạo đường dẫn thư mục: logs/{date}/{production-line}/{brick-type}/{device-position}
      const logsDir = path.join(
        process.cwd(), 
        'logs', 
        dateStr, 
        productionLine, 
        brickType,
        devicePosition
      );
      
      // Tạo thư mục nếu chưa tồn tại
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      // Kiểm tra các điều kiện tạo file mới
      const lastCount = this.lastCountCache.get(deviceId);
      const lastBrickType = this.deviceBrickTypeCache.get(`${deviceId}_last`);
      
      let isReset = false;
      let isBrickTypeChanged = false;
      
      // 1. Kiểm tra reset (count giảm xuống)
      if (lastCount !== undefined && currentCount < lastCount) {
        isReset = true;
        this.logger.log(`🔄 Device ${deviceId} reset detected: ${lastCount} → ${currentCount}`);
      }
      
      // 2. Kiểm tra thay đổi dòng gạch
      if (lastBrickType && lastBrickType !== brickType) {
        isBrickTypeChanged = true;
        this.logger.log(`🔄 Device ${deviceId} brick type changed: ${lastBrickType} → ${brickType}`);
      }
      
      // Cập nhật cache
      this.lastCountCache.set(deviceId, currentCount);
      this.lastLoggedCountCache.set(deviceId, currentCount);
      this.deviceBrickTypeCache.set(`${deviceId}_last`, brickType);
      
      // Tên file
      let logFilePath: string;
      const shouldCreateNewFile = isReset || isBrickTypeChanged;
      
      if (shouldCreateNewFile) {
        // Tạo file mới với timestamp
        const timestampSuffix = date.toISOString().replace(/[-:]/g, '').split('.')[0]; // YYYYMMDDTHHmmss
        logFilePath = path.join(logsDir, `${deviceId.toLowerCase()}_${timestampSuffix}.txt`);
        
        if (isReset) {
          this.logger.log(`📄 Creating new log file after reset: ${logFilePath}`);
        } else if (isBrickTypeChanged) {
          this.logger.log(`📄 Creating new log file after brick type change: ${logFilePath}`);
        }
      } else {
        // Tìm file mới nhất để append
        const existingFiles = fs.existsSync(logsDir) 
          ? fs.readdirSync(logsDir)
              .filter(f => f.startsWith(deviceId.toLowerCase()) && f.endsWith('.txt'))
              .sort()
              .reverse()
          : [];
        
        if (existingFiles.length > 0) {
          logFilePath = path.join(logsDir, existingFiles[0]);
        } else {
          // File đầu tiên trong ngày/brick-type
          const timestampSuffix = date.toISOString().replace(/[-:]/g, '').split('.')[0];
          logFilePath = path.join(logsDir, `${deviceId.toLowerCase()}_${timestampSuffix}.txt`);
          this.logger.log(`📄 Creating first log file: ${logFilePath}`);
        }
      }
      
      // Format log entry
      const timestampStr = date.toISOString();
      const logEntry = `[${timestampStr}] Count: ${currentCount}\n`;
      
      // Ghi vào file (append mode)
      fs.appendFileSync(logFilePath, logEntry, 'utf-8');
      
      this.logger.debug(`📝 Logged to file: ${logFilePath}`);
    } catch (error) {
      this.logger.error(`❌ Error writing device log: ${error.message}`, error.stack);
    }
  }
>>>>>>> main

            this.client = mqtt.connect(brokerUrl, {
                username,
                password,
                keepalive: 60,
                reconnectPeriod: 5000,
                clean: true,
                clientId: `nestjs_backend_${Math.random().toString(16).substr(2, 8)}`,
            });

            this.client.on('connect', () => this.onConnect());
            this.client.on('disconnect', () => this.onDisconnect());
            this.client.on('message', (topic, payload) =>
                this.onMessage(topic, payload),
            );
            this.client.on('error', (error) => this.onError(error));
            this.client.on('reconnect', () => {
                this.reconnectCount++;
                this.logger.warn(`🔄 Reconnecting to MQTT... (attempt ${this.reconnectCount})`);
            });
            this.client.on('offline', () => {
                this.logger.warn('📴 MQTT client is offline');
            });

<<<<<<< HEAD
=======
  /**
   * Set device to brick type mapping (được gọi từ telemetry handler)
   */
  setDeviceBrickTypeMapping(deviceId: string, brickTypeName: string): void {
    // Sanitize brick type name for folder structure
    const sanitizedName = brickTypeName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    this.deviceBrickTypeCache.set(deviceId, sanitizedName || 'no-brick-type');
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
      this.logger.log(`🔄 Dispatching telemetry for device: ${deviceId} to ${this.telemetryHandlers.size} handlers`);
      
      // Process với tất cả telemetry handlers TRƯỚC để set brick type mapping
      for (const [handlerName, handler] of this.telemetryHandlers) {
        try {
          await this.messageQueue.processOrdered(
            deviceId,
            timestamp,
            messageData,
            handler,
            `telemetry_${handlerName}`,
          );
          this.logger.debug(`✅ Telemetry dispatched to handler: ${handlerName}`);
>>>>>>> main
        } catch (error) {
            this.logger.error(`❌ Lỗi kết nối MQTT: ${error.message}`, error.stack);
            throw error;
        }
<<<<<<< HEAD
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
        this.logger.log('✅ Kết nối MQTT thành công!');

        // Subscribe vào các topics
        this.topics.forEach((topic) => {
            this.client.subscribe(topic, { qos: 1 }, (error) => {
                if (error) {
                    this.logger.error(`❌ Lỗi subscribe topic ${topic}: ${error.message}`);
                } else {
                    this.logger.log(`✅ Đã subscribe topic: ${topic}`);
                }
            });
        });

        // Log số handlers đã đăng ký
        this.logger.log(`📋 Telemetry handlers: ${this.telemetryHandlers.size}`);
        this.logger.log(`📋 Health handlers: ${this.healthHandlers.size}`);
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
            this.logger.log(`📨 Received MQTT message on topic: ${topic}`);
            this.logger.debug(`   Payload: ${payloadStr.substring(0, 200)}${payloadStr.length > 200 ? '...' : ''}`);
            await this.processMessage(topic, payloadStr);
        } catch (error) {
            this.logger.error(`❌ Lỗi xử lý message: ${error.message}`, error.stack);
        }
=======
      }
      
      // GHI LOG VÀO FILE SAU KHI handler đã set brick type mapping
      await this.writeDeviceLog(deviceId, messageData, timestamp);

    // Xử lý health messages
    // if (messageType === 'health') {  
    //   this.logger.log(`🔄 Dispatching health for device: ${deviceId} to ${this.healthHandlers.size} handlers`);
    //   // Process với tất cả health handlers
    //   for (const [handlerName, handler] of this.healthHandlers) {
    //     try {
    //       await this.messageQueue.processWithLock(
    //         deviceId,
    //         messageData,
    //         handler,
    //         `health_${handlerName}`,
    //       );
    //       this.logger.debug(`✅ Health dispatched to handler: ${handlerName}`);
    //     } catch (error) {
    //       this.logger.error(
    //         `❌ Error dispatching health to ${handlerName}: ${error.message}`,
    //         error.stack,
    //       );
    //     }
    //   }
>>>>>>> main
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
     * Ghi log telemetry vào file theo ngày
     * Cấu trúc: logs/{YYYY-MM-DD}/{production-line}/{device}/{deviceId}.txt
     */
    private async writeDeviceLog(
        deviceId: string,
        messageData: MqttMessage,
        timestamp: number,
    ): Promise<void> {
        try {
            // Lấy ngày hiện tại (YYYY-MM-DD)
            const date = new Date(timestamp);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

            // Parse deviceId để lấy thông tin (ví dụ: SAU-ME-01)
            const deviceParts = deviceId.split('-');
            let deviceName = deviceId.toLowerCase();

            // Tạo tên thiết bị
            if (deviceParts.length >= 2) {
                const position = deviceParts.slice(0, -1).join('-').toLowerCase(); // sau-me, truoc-ln, ...
                deviceName = position;
            }

            // Lấy production line từ cache (được set bởi telemetry handler)
            const productionLine = this.deviceLineCache.get(deviceId) || 'DC-01';

            // Tạo đường dẫn thư mục: logs/{date}/{production-line}/{device}
            const logsDir = path.join(process.cwd(), 'logs', dateStr, productionLine, deviceName);

            // Tạo thư mục nếu chưa tồn tại
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }

            // Tên file: {deviceId}.txt (ví dụ: sau-me-01.txt)
            const logFilePath = path.join(logsDir, `${deviceId.toLowerCase()}.txt`);

            // Format log entry
            const count = messageData.metrics?.count ?? 'N/A';
            const timestampStr = date.toISOString();
            const logEntry = `[${timestampStr}] Count: ${count}\n`;

            // Ghi vào file (append mode)
            fs.appendFileSync(logFilePath, logEntry, 'utf-8');

            this.logger.debug(`📝 Logged to file: ${logFilePath}`);
        } catch (error) {
            this.logger.error(`❌ Error writing device log: ${error.message}`, error.stack);
        }
    }

    /**
     * Set device to production line mapping (được gọi từ telemetry handler)
     */
    setDeviceLineMapping(deviceId: string, lineCode: string): void {
        this.deviceLineCache.set(deviceId, lineCode);
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
            // GHI LOG VÀO FILE
            await this.writeDeviceLog(deviceId, messageData, timestamp);

            this.logger.log(`🔄 Dispatching telemetry for device: ${deviceId} to ${this.telemetryHandlers.size} handlers`);
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
                    this.logger.debug(`✅ Telemetry dispatched to handler: ${handlerName}`);
                } catch (error) {
                    this.logger.error(
                        `❌ Error dispatching telemetry to ${handlerName}: ${error.message}`,
                        error.stack,
                    );
                }
            }
        }

        // Xử lý health messages
        if (messageType === 'health') {
            this.logger.log(`🔄 Dispatching health for device: ${deviceId} to ${this.healthHandlers.size} handlers`);
            // Process với tất cả health handlers
            for (const [handlerName, handler] of this.healthHandlers) {
                try {
                    await this.messageQueue.processWithLock(
                        deviceId,
                        messageData,
                        handler,
                        `health_${handlerName}`,
                    );
                    this.logger.debug(`✅ Health dispatched to handler: ${handlerName}`);
                } catch (error) {
                    this.logger.error(
                        `❌ Error dispatching health to ${handlerName}: ${error.message}`,
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
