import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MqttService } from '../mqtt.service';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';
import { v4 as uuidv4 } from 'uuid';

export interface CommandResponse {
  success: boolean;
  message: string;
  commandId: string;
  topic: string;
  affectedDevices?: number;
}

@Injectable()
export class DeviceCommandService {
  private readonly logger = new Logger(DeviceCommandService.name);

  constructor(
    @InjectRepository(ProductionLine)
    private readonly productionLineRepo: Repository<ProductionLine>,
    private readonly mqttService: MqttService,
  ) {}

  /**
   * Reset all devices on a production line
   * @param lineId Production line ID (e.g., 1, 2, 6)
   * @returns CommandResponse
   */
  async resetProductionLine(lineId: number): Promise<CommandResponse> {
    try {
      // Validate production line exists
      const line = await this.productionLineRepo.findOne({
        where: { id: lineId },
      });

      if (!line) {
        return {
          success: false,
          message: `Không tìm thấy dây chuyền ${lineId}`,
          commandId: '',
          topic: '',
        };
      }

      // Map line ID to line code (DC-01, DC-02, etc.)
      const lineCode = `DC-0${lineId}`;
      
      // Generate command
      const commandId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5); // Expire in 5 minutes

      const command = {
        schemaVer: 1,
        cmdId: commandId,
        cmd: 'reset',
        args: {
          reset: 1,
        },
        expiresAt: expiresAt.toISOString(),
        mode: 'simple',
      };

      // Topic for production line
      const topic = `broadcast/all/cmd`;

      // Publish command to MQTT
      this.logger.log(`Publishing reset command to ${topic}`);
      this.logger.debug(`Command payload: ${JSON.stringify(command)}`);

      this.mqttService.publishMessage(topic, command, {
        qos: 1,
        retain: false,
      });

      this.logger.log(`Reset command sent successfully to line ${lineId} (${lineCode})`);

      return {
        success: true,
        message: `Đã gửi lệnh reset đến dây chuyền ${lineId}`,
        commandId,
        topic,
        affectedDevices: this.getDeviceCountForLine(lineId),
      };
    } catch (error) {
      this.logger.error(`Error resetting production line ${lineId}:`, error);
      return {
        success: false,
        message: `Lỗi khi gửi lệnh reset: ${error.message}`,
        commandId: '',
        topic: '',
      };
    }
  }

  /**
   * Reset specific device
   * @param deviceId Device ID (e.g., SAU-ME-01)
   */
  async resetDevice(deviceId: string): Promise<CommandResponse> {
    try {
      const commandId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      const command = {
        schemaVer: 1,
        cmdId: commandId,
        cmd: 'reset',
        args: {
          reset: 1,
        },
        expiresAt: expiresAt.toISOString(),
        mode: 'simple',
      };

      const topic = `broadcast/device/${deviceId}/cmd`;

      this.mqttService.publishMessage(topic, command, {
        qos: 1,
        retain: false,
      });

      this.logger.log(`Reset command sent to device ${deviceId}`);

      return {
        success: true,
        message: `Đã gửi lệnh reset đến thiết bị ${deviceId}`,
        commandId,
        topic,
        affectedDevices: 1,
      };
    } catch (error) {
      this.logger.error(`Error resetting device ${deviceId}:`, error);
      return {
        success: false,
        message: `Lỗi khi gửi lệnh reset: ${error.message}`,
        commandId: '',
        topic: '',
      };
    }
  }

  /**
   * Set device counter value
   * @param deviceId Device ID
   * @param value New counter value
   */
  async setDeviceValue(deviceId: string, value: number): Promise<CommandResponse> {
    try {
      const commandId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      const command = {
        schemaVer: 1,
        cmdId: commandId,
        cmd: 'set',
        args: {
          set: value,
        },
        expiresAt: expiresAt.toISOString(),
        mode: 'simple',
      };

      const topic = `broadcast/device/${deviceId}/cmd`;

      this.mqttService.publishMessage(topic, command, {
        qos: 1,
        retain: false,
      });

      this.logger.log(`Set command sent to device ${deviceId}, value: ${value}`);

      return {
        success: true,
        message: `Đã gửi lệnh set giá trị ${value} đến thiết bị ${deviceId}`,
        commandId,
        topic,
        affectedDevices: 1,
      };
    } catch (error) {
      this.logger.error(`Error setting device ${deviceId} value:`, error);
      return {
        success: false,
        message: `Lỗi khi gửi lệnh set: ${error.message}`,
        commandId: '',
        topic: '',
      };
    }
  }

  /**
   * Emergency stop for production line
   */
  async emergencyStopLine(lineId: number): Promise<CommandResponse> {
    try {
      const line = await this.productionLineRepo.findOne({
        where: { id: lineId },
      });

      if (!line) {
        return {
          success: false,
          message: `Không tìm thấy dây chuyền ${lineId}`,
          commandId: '',
          topic: '',
        };
      }

      const lineCode = `DC-0${lineId}`;
      const commandId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      const command = {
        schemaVer: 1,
        cmdId: commandId,
        cmd: 'emergency_stop',
        args: {
          emergency_stop: 1,
        },
        expiresAt: expiresAt.toISOString(),
        mode: 'simple',
      };

      const topic = `broadcast/line/${lineCode}/cmd`;

      this.mqttService.publishMessage(topic, command, {
        qos: 1,
        retain: false,
      });

      this.logger.warn(`Emergency stop sent to line ${lineId} (${lineCode})`);

      return {
        success: true,
        message: `Đã gửi lệnh dừng khẩn cấp đến dây chuyền ${lineId}`,
        commandId,
        topic,
        affectedDevices: this.getDeviceCountForLine(lineId),
      };
    } catch (error) {
      this.logger.error(`Error emergency stop line ${lineId}:`, error);
      return {
        success: false,
        message: `Lỗi khi gửi lệnh dừng khẩn cấp: ${error.message}`,
        commandId: '',
        topic: '',
      };
    }
  }

  /**
   * Get estimated device count for a production line
   * Based on standard workflow: SAU-ME (2), TRUOC-LN (2), SAU-LN, TRUOC-MM, SAU-MC, TRUOC-DH
   */
  private getDeviceCountForLine(lineId: number): number {
    // Standard workflow has 8 devices per line
    return 8;
  }

  /**
   * Configure device settings (e.g., telemetry interval)
   * @param deviceId Device ID
   * @param interval Telemetry interval in seconds (5, 10, 15, 30, 60)
   */
  async configureDevice(deviceId: string, interval: number): Promise<CommandResponse> {
    try {
      // Validate interval
      const validIntervals = [5, 10, 15, 30, 60];
      if (!validIntervals.includes(interval)) {
        return {
          success: false,
          message: `Interval không hợp lệ. Chỉ chấp nhận: ${validIntervals.join(', ')} giây`,
          commandId: '',
          topic: '',
        };
      }

      const timestamp = new Date();
      const formattedTime = timestamp.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS

      const command = {
        ts: formattedTime,
        value: interval.toString(),
      };

      const topic = `server/all/sending_time`;

      this.mqttService.publishMessage(topic, command, {
        qos: 1,
        retain: false,
      });

      this.logger.log(`Config command sent to device ${deviceId}, interval: ${interval}s`);

      return {
        success: true,
        message: `Đã gửi lệnh config đến thiết bị ${deviceId} - Interval: ${interval}s`,
        commandId: timestamp.getTime().toString(),
        topic,
        affectedDevices: 1,
      };
    } catch (error) {
      this.logger.error(`Error configuring device ${deviceId}:`, error);
      return {
        success: false,
        message: `Lỗi khi gửi lệnh config: ${error.message}`,
        commandId: '',
        topic: '',
      };
    }
  }

  /**
   * Configure all devices on a production line
   * @param lineId Production line ID (e.g., 1, 2, 6)
   * @param interval Telemetry interval in seconds (5, 10, 15, 30, 60)
   */
  async configureProductionLine(lineId: number, interval: number): Promise<CommandResponse> {
    try {
      // Validate production line exists
      const line = await this.productionLineRepo.findOne({
        where: { id: lineId },
      });

      if (!line) {
        return {
          success: false,
          message: `Không tìm thấy dây chuyền ${lineId}`,
          commandId: '',
          topic: '',
        };
      }

      // Validate interval
      const validIntervals = [5, 10, 15, 30, 60];
      if (!validIntervals.includes(interval)) {
        return {
          success: false,
          message: `Interval không hợp lệ. Chỉ chấp nhận: ${validIntervals.join(', ')} giây`,
          commandId: '',
          topic: '',
        };
      }

      // Generate timestamp
      const timestamp = new Date();
      const formattedTime = timestamp.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS

      const command = {
        ts: formattedTime,
        value: interval.toString(),
      };

      // Topic for entire production line (broadcast to all devices)
      const topic = `server/all/sending_time`;

      // Publish command to MQTT
      this.logger.log(`Publishing config command to ${topic}, interval: ${interval}s`);
      this.logger.debug(`Command payload: ${JSON.stringify(command)}`);

      this.mqttService.publishMessage(topic, command, {
        qos: 1,
        retain: false,
      });

      const deviceCount = this.getDeviceCountForLine(lineId);
      this.logger.log(`Config command sent to ${deviceCount} devices on line ${lineId}`);

      return {
        success: true,
        message: `Đã gửi lệnh config đến ${deviceCount} thiết bị trên dây chuyền ${lineId} - Interval: ${interval}s`,
        commandId: timestamp.getTime().toString(),
        topic,
        affectedDevices: deviceCount,
      };
    } catch (error) {
      this.logger.error(`Error configuring production line ${lineId}:`, error);
      return {
        success: false,
        message: `Lỗi khi gửi lệnh config: ${error.message}`,
        commandId: '',
        topic: '',
      };
    }
  }
}
