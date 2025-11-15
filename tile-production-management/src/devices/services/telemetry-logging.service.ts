import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTelemetryLog } from '../entities/device-telemetry-log.entity';
import { getShiftInfo } from '../../common/utils/shift.utils';

/**
 * Telemetry Logging Service
 * 
 * Service chịu trách nhiệm lưu trữ tất cả telemetry logs từ MQTT
 * Mỗi MQTT message → 1 log record
 */
@Injectable()
export class TelemetryLoggingService {
  private readonly logger = new Logger(TelemetryLoggingService.name);

  // Cache để tính delta (so sánh với message trước)
  private lastTelemetryCache = new Map<string, {
    count: number;
    errCount: number;
    timestamp: Date;
  }>();

  constructor(
    @InjectRepository(DeviceTelemetryLog)
    private readonly telemetryLogRepository: Repository<DeviceTelemetryLog>,
  ) {}

  /**
   * Lưu telemetry log
   */
  async logTelemetry(data: {
    deviceId: string;
    positionId?: number;
    count: number;
    errCount: number;
    rssi: number;
    status?: string;
    battery?: number;
    temperature?: number;
    uptime?: number;
    recordedAt: Date;
    rawPayload?: Record<string, any>;
    mqttTopic?: string;
    mqttQos?: number;
  }): Promise<DeviceTelemetryLog> {
    try {
      // Sử dụng thời gian HIỆN TẠI khi nhận message, không dùng timestamp từ MQTT
      const now = new Date();
      
      // Tính toán shift info dựa trên thời gian HIỆN TẠI
      const shiftInfo = getShiftInfo(now);

      // Tính delta so với message trước
      const lastTelemetry = this.lastTelemetryCache.get(data.deviceId);
      let deltaCount: number | undefined;
      let deltaErrCount: number | undefined;
      let timeSinceLast: number | undefined;

      if (lastTelemetry) {
        deltaCount = data.count - lastTelemetry.count;
        deltaErrCount = data.errCount - lastTelemetry.errCount;
        timeSinceLast = Math.floor(
          (now.getTime() - lastTelemetry.timestamp.getTime()) / 1000
        );
      }

      // Tạo log record
      const log = this.telemetryLogRepository.create({
        deviceId: data.deviceId,
        positionId: data.positionId,
        count: data.count,
        errCount: data.errCount,
        rssi: data.rssi,
        status: data.status || 'unknown',
        battery: data.battery,
        temperature: data.temperature,
        uptime: data.uptime,
        shiftDate: shiftInfo.shiftDate,
        shiftType: shiftInfo.shiftType,
        shiftNumber: shiftInfo.shiftNumber,
        recordedAt: now, // Dùng thời gian hiện tại
        rawPayload: data.rawPayload,
        mqttTopic: data.mqttTopic,
        mqttQos: data.mqttQos,
        deltaCount,
        deltaErrCount,
        timeSinceLast,
      });

      // Lưu vào database
      const saved = await this.telemetryLogRepository.save(log);

      // Update cache
      this.lastTelemetryCache.set(data.deviceId, {
        count: data.count,
        errCount: data.errCount,
        timestamp: now, // Dùng thời gian hiện tại
      });

      this.logger.debug(
        `📝 Logged telemetry for ${data.deviceId}: count=${data.count}, shift=${shiftInfo.shiftType} ${shiftInfo.shiftDate}, recordedAt=${now.toISOString()}`
      );

      return saved;
    } catch (error) {
      this.logger.error(`Failed to log telemetry for ${data.deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Lấy logs theo device và khoảng thời gian
   */
  async getLogsByDevice(
    deviceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DeviceTelemetryLog[]> {
    return this.telemetryLogRepository.find({
      where: {
        deviceId,
      },
      order: {
        recordedAt: 'ASC',
      },
    });
  }

  /**
   * Lấy logs theo shift
   */
  async getLogsByShift(
    deviceId: string,
    shiftDate: string,
    shiftType: 'day' | 'night',
  ): Promise<DeviceTelemetryLog[]> {
    return this.telemetryLogRepository.find({
      where: {
        deviceId,
        shiftDate,
        shiftType,
      },
      order: {
        recordedAt: 'ASC',
      },
    });
  }

  /**
   * Lấy log đầu tiên và cuối cùng của shift
   */
  async getShiftBoundaryLogs(
    deviceId: string,
    shiftDate: string,
    shiftType: 'day' | 'night',
  ): Promise<{
    first: DeviceTelemetryLog | null;
    last: DeviceTelemetryLog | null;
  }> {
    const logs = await this.getLogsByShift(deviceId, shiftDate, shiftType);

    return {
      first: logs.length > 0 ? logs[0] : null,
      last: logs.length > 0 ? logs[logs.length - 1] : null,
    };
  }

  /**
   * Thống kê số lượng logs
   */
  async getLogStats(deviceId?: string): Promise<{
    totalLogs: number;
    oldestLog: Date | null;
    newestLog: Date | null;
  }> {
    const query = this.telemetryLogRepository.createQueryBuilder('log');

    if (deviceId) {
      query.where('log.deviceId = :deviceId', { deviceId });
    }

    const [totalLogs, oldestLog, newestLog] = await Promise.all([
      query.getCount(),
      query.orderBy('log.recordedAt', 'ASC').getOne(),
      query.orderBy('log.recordedAt', 'DESC').getOne(),
    ]);

    return {
      totalLogs,
      oldestLog: oldestLog?.recordedAt || null,
      newestLog: newestLog?.recordedAt || null,
    };
  }

  /**
   * Xóa logs cũ (data retention)
   */
  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.telemetryLogRepository
      .createQueryBuilder()
      .delete()
      .where('recordedAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(
      `🗑️ Cleaned up ${result.affected || 0} logs older than ${retentionDays} days`
    );

    return result.affected || 0;
  }
}
