/**
 * Devices MQTT Handler
 * Handler xử lý MQTT messages cho devices
 * 
 * Tương tự apps/tong_quan/mqtt_handler.py trong old-vicenza-ims-web
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MqttService } from '../mqtt/mqtt.service';
import { WebSocketGatewayService } from '../websocket/websocket.gateway';
import { BoundedCacheService, RateLimitCacheService } from '../common/cache/bounded-cache.service';
import { Device } from './entities/device.entity';

interface TelemetryMessage {
  deviceId?: string;
  ts?: string;
  metrics?: {
    count?: number;
    err_count?: number;
  };
  quality?: {
    rssi?: number;
  };
}

interface HealthMessage {
  deviceId?: string;
  ts?: string;
  status?: string;
  battery?: number;
  [key: string]: any;
}

@Injectable()
export class DevicesMqttHandler implements OnModuleInit {
  private readonly logger = new Logger(DevicesMqttHandler.name);
  
  // Cache để lưu dữ liệu mới nhất
  private deviceLatestData: BoundedCacheService;
  private deviceHealthCache: BoundedCacheService;
  
  // Rate limiting để giảm tải WebSocket
  private broadcastRateLimiter: RateLimitCacheService;

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly mqttService: MqttService,
    private readonly websocketGateway: WebSocketGatewayService,
  ) {
    // Initialize caches
    this.deviceLatestData = new BoundedCacheService(100, 3600000); // 100 entries, 1 hour TTL
    this.deviceHealthCache = new BoundedCacheService(100, 3600000);
    this.broadcastRateLimiter = new RateLimitCacheService(200); // 200ms min interval
  }

  onModuleInit() {
    // Đăng ký handlers với MQTT service
    this.mqttService.registerTelemetryHandler(
      'devices',
      this.handleTelemetryMessage.bind(this),
    );
    
    this.mqttService.registerHealthHandler(
      'devices',
      this.handleHealthMessage.bind(this),
    );
    
    this.logger.log('Devices MQTT handlers registered');
  }

  /**
   * Xử lý telemetry message
   */
  async handleTelemetryMessage(
    deviceId: string,
    message: TelemetryMessage,
  ): Promise<void> {
    try {
      const metrics = message.metrics || {};
      const quality = message.quality || {};
      
      let count = metrics.count || 0;
      let errCount = metrics.err_count || 0;
      const rssi = quality.rssi || 0;

      // Validate dữ liệu đầu vào
      if (typeof count !== 'number') {
        this.logger.error(
          `Invalid count type for ${deviceId}: ${typeof count}, expected number`,
        );
        return;
      }

      if (typeof errCount !== 'number') {
        this.logger.error(
          `Invalid err_count type for ${deviceId}: ${typeof errCount}, expected number`,
        );
        return;
      }

      // Reject negative values
      if (count < 0) {
        this.logger.warn(`Negative count for ${deviceId}: ${count}, setting to 0`);
        count = 0;
      }

      if (errCount < 0) {
        this.logger.warn(`Negative err_count for ${deviceId}: ${errCount}, setting to 0`);
        errCount = 0;
      }

      // Sanity check: Count không nên quá lớn
      if (count > 10000000) {
        this.logger.error(`Count too large for ${deviceId}: ${count}, rejecting`);
        return;
      }

      this.logger.log(
        `[DEVICES] Received telemetry from ${deviceId}: count=${count}, err_count=${errCount}, rssi=${rssi}`,
      );

      // Parse timestamp
      const timestamp = message.ts ? new Date(message.ts) : new Date();

      // Lưu vào cache
      this.deviceLatestData.set(deviceId, {
        count,
        errCount,
        rssi,
        timestamp,
      });

      // Trigger WebSocket broadcast với rate limiting
      if (this.broadcastRateLimiter.shouldBroadcast(deviceId)) {
        this.websocketGateway.broadcastDeviceUpdate(deviceId, {
          count,
          errCount,
          rssi,
          timestamp: timestamp.toISOString(),
        });
      }

      // TODO: Lưu vào database nếu cần
      // await this.saveTelemetryToDatabase(deviceId, count, errCount, rssi, timestamp);
    } catch (error) {
      this.logger.error(
        `Error processing telemetry for ${deviceId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Xử lý health message
   */
  async handleHealthMessage(
    deviceId: string,
    message: HealthMessage,
  ): Promise<void> {
    try {
      const status = message.status || 'unknown';
      const battery = message.battery || 0;

      this.logger.log(
        `[DEVICES] Received health from ${deviceId}: status=${status}, battery=${battery}`,
      );

      // Lưu vào cache
      this.deviceHealthCache.set(deviceId, {
        status,
        battery,
        timestamp: new Date(),
      });

      // Broadcast health update
      this.websocketGateway.broadcastDeviceUpdate(deviceId, {
        status,
        battery,
        type: 'health',
      });

      // TODO: Cập nhật device health trong database
      // await this.updateDeviceHealth(deviceId, status, battery);
    } catch (error) {
      this.logger.error(
        `Error processing health for ${deviceId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Lấy latest data từ cache
   */
  getLatestDeviceData(deviceId: string): any {
    return this.deviceLatestData.get(deviceId);
  }

  /**
   * Lấy tất cả device data từ cache
   */
  getAllDeviceData(): Record<string, any> {
    const result: Record<string, any> = {};
    const keys = this.deviceLatestData.keys();
    
    keys.forEach((key) => {
      const data = this.deviceLatestData.get(key);
      if (data) {
        result[key] = data;
      }
    });
    
    return result;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.deviceLatestData.clear();
    this.deviceHealthCache.clear();
  }
}
