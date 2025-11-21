/**
 * Devices MQTT Handler
 * Handler xử lý MQTT messages cho devices
 * 
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MqttService } from '../mqtt/mqtt.service';
import { WebSocketGatewayService } from '../websocket/websocket.gateway';
import { BoundedCacheService, RateLimitCacheService } from '../common/cache/bounded-cache.service';
import { Device } from './entities/device.entity';
import { DeviceTelemetry } from './entities/device-telemetry.entity';

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
    @InjectRepository(DeviceTelemetry)
    private readonly telemetryRepository: Repository<DeviceTelemetry>,
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
      // Log raw message data
      this.logger.log(`╔════════════════════════════════════════════════════════════`);
      this.logger.log(`║ 📊 TELEMETRY MESSAGE RECEIVED`);
      this.logger.log(`║ Device ID: ${deviceId}`);
      this.logger.log(`║ Timestamp: ${message.ts || 'N/A'}`);
      this.logger.log(`║ Raw Message: ${JSON.stringify(message, null, 2)}`);
      this.logger.log(`╚════════════════════════════════════════════════════════════`);

      const metrics = message.metrics || {};
      const quality = message.quality || {};
      
      let count = metrics.count || 0;
      let errCount = metrics.err_count || 0;
      const rssi = quality.rssi || 0;

      // Log parsed values
      this.logger.log(`📈 Parsed Metrics:`);
      this.logger.log(`   - Count: ${count} (type: ${typeof count})`);
      this.logger.log(`   - Error Count: ${errCount} (type: ${typeof errCount})`);
      this.logger.log(`   - RSSI: ${rssi} dBm (type: ${typeof rssi})`);

      // Validate dữ liệu đầu vào
      if (typeof count !== 'number') {
        this.logger.error(
          `❌ Invalid count type for ${deviceId}: ${typeof count}, expected number`,
        );
        return;
      }

      if (typeof errCount !== 'number') {
        this.logger.error(
          `❌ Invalid err_count type for ${deviceId}: ${typeof errCount}, expected number`,
        );
        return;
      }

      // Reject negative values
      if (count < 0) {
        this.logger.warn(`⚠️ Negative count for ${deviceId}: ${count}, setting to 0`);
        count = 0;
      }

      if (errCount < 0) {
        this.logger.warn(`⚠️ Negative err_count for ${deviceId}: ${errCount}, setting to 0`);
        errCount = 0;
      }

      // Sanity check: Count không nên quá lớn
      if (count > 10000000) {
        this.logger.error(`❌ Count too large for ${deviceId}: ${count}, rejecting`);
        return;
      }

      // Parse timestamp
      const timestamp = message.ts ? new Date(message.ts) : new Date();

      // Lưu vào cache
      this.deviceLatestData.set(deviceId, {
        count,
        errCount,
        rssi,
        timestamp,
      });

      this.logger.log(`✅ Data cached for ${deviceId}`);
      this.logger.log(`💾 Cache entry: count=${count}, err_count=${errCount}, rssi=${rssi}`);

      // Lưu vào database (UPSERT)
      try {
        let telemetry = await this.telemetryRepository.findOne({ 
          where: { deviceId },
          relations: ['position', 'position.productionLine']
        });
        
        if (!telemetry) {
          this.logger.log(`🆕 Creating new telemetry record for ${deviceId}`);
          telemetry = this.telemetryRepository.create({ deviceId });
        } else {
          this.logger.log(`🔄 Updating existing telemetry record for ${deviceId}`);
          
          // Set device line mapping cho file logging
          if (telemetry.position?.productionLine) {
            const lineName = telemetry.position.productionLine.name;
            this.mqttService.setDeviceLineMapping(deviceId, lineName);
            this.logger.debug(`📍 Set device ${deviceId} -> line ${lineName}`);
          }
        }
        
        telemetry.count = count;
        telemetry.errCount = errCount;
        telemetry.rssi = rssi;
        telemetry.lastMessageAt = timestamp;
        telemetry.rawData = message;
        
        await this.telemetryRepository.save(telemetry);
        this.logger.log(`💾 Telemetry saved to database for ${deviceId}`);
        
        // 📝 Lưu telemetry log (cho tracking lịch sử)
        try {
        //   await this.telemetryLoggingService.logTelemetry({
        //     deviceId,
        //     count,
        //     errCount,
        //     rssi,
        //     recordedAt: timestamp,
        //     rawPayload: message,
        //     mqttTopic: `devices/${deviceId}/telemetry`,
        //   });
          this.logger.debug(`📝 Telemetry log saved for ${deviceId}`);
        } catch (logError) {
          this.logger.error(`❌ Failed to save telemetry log: ${logError.message}`);
        }
      } catch (error) {
        this.logger.error(`❌ Failed to save telemetry to DB for ${deviceId}: ${error.message}`);
      }

      // Trigger WebSocket broadcast với rate limiting
      if (this.broadcastRateLimiter.shouldBroadcast(deviceId)) {
        const broadcastData = {
          count,
          errCount,
          rssi,
          timestamp: timestamp.toISOString(),
        };
        
        this.logger.log(`📡 Broadcasting to WebSocket clients...`);
        this.logger.log(`   Broadcast data: ${JSON.stringify(broadcastData)}`);
        
        this.websocketGateway.broadcastDeviceUpdate(deviceId, broadcastData);
        
        this.logger.log(`✅ Broadcast completed`);
      } else {
        this.logger.debug(`⏭️ Skipping broadcast (rate limited) for ${deviceId}`);
      }

      this.logger.log(`─────────────────────────────────────────────────────────────\n`);

      // TODO: Lưu vào database nếu cần
      // await this.saveTelemetryToDatabase(deviceId, count, errCount, rssi, timestamp);
    } catch (error) {
      this.logger.error(
        `❌ Error processing telemetry for ${deviceId}: ${error.message}`,
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
      // Log raw message data
      this.logger.log(`╔════════════════════════════════════════════════════════════`);
      this.logger.log(`║ 🏥 HEALTH MESSAGE RECEIVED`);
      this.logger.log(`║ Device ID: ${deviceId}`);
      this.logger.log(`║ Timestamp: ${message.ts || 'N/A'}`);
      this.logger.log(`║ Raw Message: ${JSON.stringify(message, null, 2)}`);
      this.logger.log(`╚════════════════════════════════════════════════════════════`);

      const status = message.status || 'unknown';
      const battery = message.battery || 0;

      // Log parsed values
      this.logger.log(`🔋 Parsed Health Data:`);
      this.logger.log(`   - Status: ${status}`);
      this.logger.log(`   - Battery: ${battery}%`);

      // Log all additional fields
      const additionalFields = Object.keys(message).filter(
        key => !['deviceId', 'ts', 'status', 'battery'].includes(key)
      );
      
      if (additionalFields.length > 0) {
        this.logger.log(`📋 Additional Fields:`);
        additionalFields.forEach(key => {
          this.logger.log(`   - ${key}: ${JSON.stringify(message[key])}`);
        });
      }

      // Lưu vào cache
      const healthData = {
        status,
        battery,
        timestamp: new Date(),
        ...message, // Include all additional fields
      };
      
      this.deviceHealthCache.set(deviceId, healthData);

      this.logger.log(`✅ Health data cached for ${deviceId}`);

      // Lưu health data vào database
      try {
        let telemetry = await this.telemetryRepository.findOne({ 
          where: { deviceId } 
        });
        
        if (!telemetry) {
          this.logger.log(`🆕 Creating new telemetry record for health data ${deviceId}`);
          telemetry = this.telemetryRepository.create({ deviceId });
        } else {
          this.logger.log(`🔄 Updating health data in existing record for ${deviceId}`);
        }
        
        telemetry.status = status;
        telemetry.battery = battery;
        telemetry.temperature = message.temperature;
        telemetry.uptime = message.uptime;
        telemetry.lastMessageAt = new Date(message.ts || Date.now());
        
        // Merge raw data
        if (telemetry.rawData) {
          telemetry.rawData = { ...telemetry.rawData, health: message };
        } else {
          telemetry.rawData = { health: message };
        }
        
        await this.telemetryRepository.save(telemetry);
        this.logger.log(`💾 Health data saved to database for ${deviceId}`);
      } catch (error) {
        this.logger.error(`❌ Failed to save health data to DB for ${deviceId}: ${error.message}`);
      }

      // Broadcast health update
      const broadcastData = {
        status,
        battery,
        type: 'health',
      };
      
      this.logger.log(`📡 Broadcasting health update to WebSocket clients...`);
      this.logger.log(`   Broadcast data: ${JSON.stringify(broadcastData)}`);
      
      this.websocketGateway.broadcastDeviceUpdate(deviceId, broadcastData);
      
      this.logger.log(`✅ Health broadcast completed`);
      this.logger.log(`─────────────────────────────────────────────────────────────\n`);

      // TODO: Cập nhật device health trong database
      // await this.updateDeviceHealth(deviceId, status, battery);
    } catch (error) {
      this.logger.error(
        `❌ Error processing health for ${deviceId}: ${error.message}`,
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