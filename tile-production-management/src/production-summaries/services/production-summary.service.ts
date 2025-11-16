import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductionShiftSummary } from '../entities/production-shift-summary.entity';
import { ProductionDailySummary } from '../entities/production-daily-summary.entity';
import { DeviceTelemetryLog } from '../../devices/entities/device-telemetry-log.entity';
import { Device } from '../../devices/entities/device.entity';
import { 
  getCurrentShiftInfo, 
  getPreviousShiftInfo, 
  getShiftBoundaries,
  getShiftInfo,
} from '../../common/utils/shift.utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Production Summary Service
 * 
 * Service tự động chốt số liệu sản xuất theo ca và theo ngày
 * 
 * Jobs:
 * - Chốt ca: Chạy vào 6h và 18h mỗi ngày
 * - Chốt ngày: Chạy vào 6h sáng hôm sau
 */
@Injectable()
export class ProductionSummaryService {
  private readonly logger = new Logger(ProductionSummaryService.name);

  constructor(
    @InjectRepository(ProductionShiftSummary)
    private readonly shiftSummaryRepository: Repository<ProductionShiftSummary>,
    @InjectRepository(ProductionDailySummary)
    private readonly dailySummaryRepository: Repository<ProductionDailySummary>,
    @InjectRepository(DeviceTelemetryLog)
    private readonly telemetryLogRepository: Repository<DeviceTelemetryLog>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  /**
   * TEST Cron job: Ghi thông tin shift ra file (mỗi 2 phút)
   * Không lưu database, chỉ ghi ra file để test
   */
  @Cron('*/2 * * * *') // Mỗi 2 phút
  async handleTestLogToFile() {
    const now = new Date();
    const logFile = path.join(process.cwd(), 'test-shift-logs.txt');
    
    try {
      const currentShift = getCurrentShiftInfo();
      
      const logContent = `
================================================================================
⏰ TEST LOG - ${now.toISOString()}
================================================================================
📅 Thời gian hiện tại: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}

📊 THÔNG TIN CA HIỆN TẠI:
   - Loại ca: ${currentShift.shiftType === 'day' ? 'Ca ngày (6h-18h)' : 'Ca đêm (18h-6h)'}
   - Ngày ca: ${currentShift.shiftDate}
   - Số ca: ${currentShift.shiftNumber}
   - Bắt đầu: ${currentShift.shiftStartAt.toLocaleString('vi-VN')}
   - Kết thúc: ${currentShift.shiftEndAt.toLocaleString('vi-VN')}

📦 KIỂM TRA DEVICES:
`;

      // Lấy danh sách devices
      const devices = await this.deviceRepository.find();
      let deviceInfo = `   - Tổng số devices: ${devices.length}\n`;
      
      for (const device of devices) {
        // Đếm logs của device trong ca hiện tại
        const logsCount = await this.telemetryLogRepository.count({
          where: { 
            deviceId: device.deviceId, 
            shiftDate: currentShift.shiftDate, 
            shiftType: currentShift.shiftType 
          },
        });
        
        // Lấy log MỚI NHẤT (hiện tại)
        const latestLog = await this.telemetryLogRepository.findOne({
          where: { 
            deviceId: device.deviceId, 
            shiftDate: currentShift.shiftDate, 
            shiftType: currentShift.shiftType 
          },
          order: { recordedAt: 'DESC' },
        });
        
        // Lấy log TRƯỚC ĐÓ (>= 2 phút trước)
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
        const previousLog = await this.telemetryLogRepository
          .createQueryBuilder('log')
          .where('log.deviceId = :deviceId', { deviceId: device.deviceId })
          .andWhere('log.shiftDate = :shiftDate', { shiftDate: currentShift.shiftDate })
          .andWhere('log.shiftType = :shiftType', { shiftType: currentShift.shiftType })
          .andWhere('log.recordedAt <= :twoMinutesAgo', { twoMinutesAgo })
          .orderBy('log.recordedAt', 'DESC')
          .getOne();
        
        deviceInfo += `   - ${device.deviceId}: ${logsCount} logs`;
        if (latestLog && previousLog) {
          const incrementalCount = latestLog.count - previousLog.count;
          deviceInfo += `\n     → Previous: ${previousLog.count} (${previousLog.recordedAt.toLocaleString('vi-VN')})`;
          deviceInfo += `\n     → Current: ${latestLog.count} (${latestLog.recordedAt.toLocaleString('vi-VN')})`;
          deviceInfo += `\n     → Sản xuất trong 2 phút: ${incrementalCount} viên`;
        } else if (latestLog) {
          deviceInfo += `\n     → Current: ${latestLog.count} (${latestLog.recordedAt.toLocaleString('vi-VN')})`;
          deviceInfo += `\n     → (Chưa có log trước đó để so sánh)`;
        }
        deviceInfo += '\n';
      }
      
      const fullLog = logContent + deviceInfo + '\n';
      
      // Append to file
      fs.appendFileSync(logFile, fullLog);
      
      this.logger.log(`📝 Test log written to ${logFile}`);
    } catch (error) {
      this.logger.error(`❌ Failed to write test log: ${error.message}`);
      fs.appendFileSync(logFile, `\n❌ ERROR at ${now.toISOString()}: ${error.message}\n\n`);
    }
  }

  /**
   * Cron job: Chốt ca TESTING (mỗi 5 phút)
   * Dùng để test - chạy mỗi 5 phút
   * Bỏ comment để test, comment lại khi deploy production
   * Logic: Chốt ca VỪA KẾT THÚC (giống production)
   */
  // @Cron('*/5 * * * *') // Mỗi 5 phút
  async handleShiftClosureTest() {
    this.logger.log('🧪 TEST: Shift closure job triggered (every 5 minutes)');
    
    try {
      // Lấy ca HIỆN TẠI để xác định ca VỪA KẾT THÚC
      const currentShift = getCurrentShiftInfo();
      const previousShift = getPreviousShiftInfo(currentShift);
      
      this.logger.log(`📊 TEST: Closing PREVIOUS shift (vừa kết thúc): ${previousShift.shiftType} ${previousShift.shiftDate}`);
      this.logger.log(`   Shift boundaries: ${previousShift.shiftStartAt.toISOString()} - ${previousShift.shiftEndAt.toISOString()}`);
      
      const devices = await this.deviceRepository.find();
      
      for (const device of devices) {
        await this.closeShift(
          device.deviceId,
          previousShift.shiftDate,
          previousShift.shiftType,
        );
      }
      
      this.logger.log(`✅ TEST: Shift closure completed for ${devices.length} devices`);
    } catch (error) {
      this.logger.error('❌ TEST: Shift closure job failed:', error);
    }
  }

  /**
   * Cron job: Chốt ca
   * Chạy vào 6h và 18h mỗi ngày
   * - 6h sáng: Chốt ca đêm vừa kết thúc (18h hôm qua → 6h hôm nay)
   * - 18h chiều: Chốt ca ngày vừa kết thúc (6h → 18h hôm nay)
   */
  @Cron('0 6,18 * * *') // 6:00 AM and 6:00 PM
  async handleShiftClosure() {
    this.logger.log('🔔 Shift closure job triggered');
    const now = new Date();
    const logFile = path.join(process.cwd(), 'shift-closure-logs.txt');
    
    try {
      // Lấy ca HIỆN TẠI để xác định ca VỪA KẾT THÚC
      const currentShift = getCurrentShiftInfo();
      const previousShift = getPreviousShiftInfo(currentShift);
      
      this.logger.log(`📊 Closing PREVIOUS shift (vừa kết thúc): ${previousShift.shiftType} ${previousShift.shiftDate}`);
      this.logger.log(`   Shift boundaries: ${previousShift.shiftStartAt.toISOString()} - ${previousShift.shiftEndAt.toISOString()}`);
      
      let logContent = `
================================================================================
📊 CHỐT CA - ${now.toISOString()}
================================================================================
⏰ Thời gian chốt: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
📅 Ca được chốt: ${previousShift.shiftType === 'day' ? 'Ca ngày' : 'Ca đêm'} ${previousShift.shiftDate}
🕐 Thời gian ca: ${previousShift.shiftStartAt.toLocaleString('vi-VN')} → ${previousShift.shiftEndAt.toLocaleString('vi-VN')}

📦 KẾT QUẢ CHỐT CA:
`;
      
      // Chốt ca VỪA KẾT THÚC cho tất cả devices
      const devices = await this.deviceRepository.find();
      const results: Array<{
        deviceId: string;
        totalCount: number;
        totalErrCount: number;
        errorRate: number;
        messageCount: number;
      }> = [];
      
      for (const device of devices) {
        const summary = await this.closeShift(
          device.deviceId,
          previousShift.shiftDate,
          previousShift.shiftType,
        );
        results.push({
          deviceId: device.deviceId,
          totalCount: summary.totalCount,
          totalErrCount: summary.totalErrCount,
          errorRate: summary.errorRate,
          messageCount: summary.messageCount,
        });
      }
      
      // Ghi kết quả vào log
      for (const result of results) {
        logContent += `   - ${result.deviceId}:\n`;
        logContent += `     → Sản xuất: ${result.totalCount} viên\n`;
        logContent += `     → Lỗi: ${result.totalErrCount} viên (${(result.errorRate || 0).toFixed(2)}%)\n`;
        logContent += `     → Số logs: ${result.messageCount}\n`;
      }
      
      const totalProduction = results.reduce((sum, r) => sum + r.totalCount, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.totalErrCount, 0);
      
      logContent += `\n📈 TỔNG KẾT:\n`;
      logContent += `   - Tổng sản xuất: ${totalProduction} viên\n`;
      logContent += `   - Tổng lỗi: ${totalErrors} viên\n`;
      logContent += `   - Số devices: ${devices.length}\n\n`;
      
      fs.appendFileSync(logFile, logContent);
      
      this.logger.log(`✅ Shift closure completed for ${devices.length} devices`);
      this.logger.log(`📝 Log written to ${logFile}`);
    } catch (error) {
      this.logger.error('❌ Shift closure job failed:', error);
      fs.appendFileSync(logFile, `\n❌ ERROR at ${now.toISOString()}: ${error.message}\n\n`);
    }
  }

  /**
   * Cron job: Chốt ngày
   * Chạy vào 6h sáng mỗi ngày (sau khi chốt ca đêm)
   */
  @Cron('0 6 * * *') // 6:00 AM
  async handleDailyClosure() {
    this.logger.log('🔔 Daily closure job triggered');
    const now = new Date();
    const logFile = path.join(process.cwd(), 'daily-closure-logs.txt');
    
    try {
      // Chốt ngày hôm trước
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const summaryDate = yesterday.toISOString().split('T')[0];
      
      this.logger.log(`📊 Closing day: ${summaryDate}`);
      
      let logContent = `
================================================================================
📅 CHỐT NGÀY - ${now.toISOString()}
================================================================================
⏰ Thời gian chốt: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
📅 Ngày được chốt: ${summaryDate}

📦 KẾT QUẢ CHỐT NGÀY:
`;
      
      // Chốt ngày cho tất cả devices
      const devices = await this.deviceRepository.find();
      const results: Array<{
        deviceId: string;
        dayShiftCount: number;
        nightShiftCount: number;
        totalCount: number;
        totalErrCount: number;
        errorRate: number;
      }> = [];
      
      for (const device of devices) {
        const summary = await this.closeDay(device.deviceId, summaryDate);
        results.push({
          deviceId: device.deviceId,
          dayShiftCount: summary.dayShiftCount,
          nightShiftCount: summary.nightShiftCount,
          totalCount: summary.totalCount,
          totalErrCount: summary.totalErrCount,
          errorRate: summary.errorRate,
        });
      }
      
      // Ghi kết quả vào log
      for (const result of results) {
        logContent += `   - ${result.deviceId}:\n`;
        logContent += `     → Ca ngày: ${result.dayShiftCount} viên\n`;
        logContent += `     → Ca đêm: ${result.nightShiftCount} viên\n`;
        logContent += `     → Tổng: ${result.totalCount} viên\n`;
        logContent += `     → Lỗi: ${result.totalErrCount} viên (${(result.errorRate || 0).toFixed(2)}%)\n`;
      }
      
      const totalProduction = results.reduce((sum, r) => sum + r.totalCount, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.totalErrCount, 0);
      const totalDay = results.reduce((sum, r) => sum + r.dayShiftCount, 0);
      const totalNight = results.reduce((sum, r) => sum + r.nightShiftCount, 0);
      
      logContent += `\n📈 TỔNG KẾT NGÀY:\n`;
      logContent += `   - Ca ngày: ${totalDay} viên\n`;
      logContent += `   - Ca đêm: ${totalNight} viên\n`;
      logContent += `   - Tổng sản xuất: ${totalProduction} viên\n`;
      logContent += `   - Tổng lỗi: ${totalErrors} viên\n`;
      logContent += `   - Số devices: ${devices.length}\n\n`;
      
      fs.appendFileSync(logFile, logContent);
      
      this.logger.log(`✅ Daily closure completed for ${devices.length} devices`);
      this.logger.log(`📝 Log written to ${logFile}`);
    } catch (error) {
      this.logger.error('❌ Daily closure job failed:', error);
      fs.appendFileSync(logFile, `\n❌ ERROR at ${now.toISOString()}: ${error.message}\n\n`);
    }
  }

  /**
   * Chốt ca cho một thiết bị
   */
  async closeShift(
    deviceId: string,
    shiftDate: string,
    shiftType: 'day' | 'night',
  ): Promise<ProductionShiftSummary> {
    this.logger.log(`📋 Closing shift for device ${deviceId}: ${shiftType} ${shiftDate}`);

    // Kiểm tra đã chốt chưa
    const existing = await this.shiftSummaryRepository.findOne({
      where: { deviceId, shiftDate, shiftType },
    });

    if (existing && existing.status === 'completed') {
      this.logger.warn(`⚠️ Shift already closed: ${deviceId} ${shiftType} ${shiftDate}`);
      return existing;
    }

    // Lấy device info
    const device = await this.deviceRepository.findOne({
      where: { deviceId },
      relations: ['position', 'position.productionLine', 'position.productionLine.workshop'],
    });

    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Lấy logs trong ca
    const logs = await this.telemetryLogRepository.find({
      where: { deviceId, shiftDate, shiftType },
      order: { recordedAt: 'ASC' },
    });

    this.logger.debug(`📊 Query result: Found ${logs.length} logs for ${deviceId} ${shiftType} ${shiftDate}`);
    
    if (logs.length > 0) {
      this.logger.debug(`   First log: count=${logs[0].count}, recordedAt=${logs[0].recordedAt}`);
      this.logger.debug(`   Last log: count=${logs[logs.length - 1].count}, recordedAt=${logs[logs.length - 1].recordedAt}`);
    }

    if (logs.length === 0) {
      this.logger.warn(`⚠️ No logs found for shift: ${deviceId} ${shiftType} ${shiftDate}`);
      
      // Tạo summary rỗng
      return this.createEmptyShiftSummary(device, shiftDate, shiftType);
    }

    // Log đầu tiên và cuối cùng
    const firstLog = logs[0];
    const lastLog = logs[logs.length - 1];

    // Tính toán metrics
    const startCount = firstLog.count;
    const endCount = lastLog.count;
    const totalCount = endCount - startCount;

    this.logger.log(`📈 Metrics calculation:`);
    this.logger.log(`   startCount: ${startCount} (from first log)`);
    this.logger.log(`   endCount: ${endCount} (from last log)`);
    this.logger.log(`   totalCount: ${totalCount} (difference)`);
    this.logger.log(`   logs analyzed: ${logs.length} records`);

    const startErrCount = firstLog.errCount;
    const endErrCount = lastLog.errCount;
    const totalErrCount = endErrCount - startErrCount;

    const errorRate = totalCount > 0 ? (totalErrCount / totalCount) * 100 : 0;

    // Tính RSSI trung bình
    const avgRssi = Math.round(
      logs.reduce((sum, log) => sum + log.rssi, 0) / logs.length
    );
    const minRssi = Math.min(...logs.map(log => log.rssi));
    const maxRssi = Math.max(...logs.map(log => log.rssi));

    // Tính battery, temperature trung bình
    const batteryLogs = logs.filter(log => log.battery !== null && log.battery !== undefined);
    const avgBattery = batteryLogs.length > 0
      ? Math.round(batteryLogs.reduce((sum, log) => sum + log.battery!, 0) / batteryLogs.length)
      : undefined;

    const tempLogs = logs.filter(log => log.temperature !== null && log.temperature !== undefined);
    const avgTemperature = tempLogs.length > 0
      ? Math.round(tempLogs.reduce((sum, log) => sum + log.temperature!, 0) / tempLogs.length)
      : undefined;

    // Tính uptime
    const uptimeLogs = logs.filter(log => log.uptime !== null && log.uptime !== undefined);
    const avgUptime = uptimeLogs.length > 0
      ? Math.round(uptimeLogs.reduce((sum, log) => sum + log.uptime!, 0) / uptimeLogs.length)
      : undefined;

    // Tính production rate (sản phẩm/giờ)
    const shiftDurationHours = 12; // Mỗi ca 12 giờ
    const avgProductionRate = totalCount / shiftDurationHours;

    // Lấy shift boundaries
    const date = new Date(shiftDate);
    const { shiftStartAt, shiftEndAt } = getShiftBoundaries(date, shiftType);
    const shiftInfo = getShiftInfo(shiftStartAt);

    // Tạo hoặc update summary
    const summary = existing || this.shiftSummaryRepository.create({
      deviceId,
      shiftDate,
      shiftType,
      shiftNumber: shiftInfo.shiftNumber,
      shiftStartAt,
      shiftEndAt,
      positionId: device.position?.id,
      productionLineId: device.position?.productionLine?.id,
      workshopId: device.position?.productionLine?.workshop?.id,
    });

    // Update metrics
    Object.assign(summary, {
      startCount,
      endCount,
      totalCount,
      startErrCount,
      endErrCount,
      totalErrCount,
      errorRate,
      avgRssi,
      minRssi,
      maxRssi,
      avgBattery,
      avgTemperature,
      messageCount: logs.length,
      avgUptime,
      avgProductionRate,
      status: 'completed',
      closedAt: new Date(),
      closedBy: 'system',
    });

    const saved = await this.shiftSummaryRepository.save(summary);
    
    this.logger.log(
      `✅ Shift closed: ${deviceId} ${shiftType} ${shiftDate} - Total: ${totalCount} (${logs.length} messages)`
    );

    return saved;
  }

  /**
   * Chốt ngày cho một thiết bị
   */
  async closeDay(
    deviceId: string,
    summaryDate: string,
  ): Promise<ProductionDailySummary> {
    this.logger.log(`📋 Closing day for device ${deviceId}: ${summaryDate}`);

    // Kiểm tra đã chốt chưa
    const existing = await this.dailySummaryRepository.findOne({
      where: { deviceId, summaryDate },
    });

    if (existing && existing.status === 'completed') {
      this.logger.warn(`⚠️ Day already closed: ${deviceId} ${summaryDate}`);
      return existing;
    }

    // Lấy 2 shift summaries của ngày
    const dayShift = await this.shiftSummaryRepository.findOne({
      where: { deviceId, shiftDate: summaryDate, shiftType: 'day' },
    });

    const nightShift = await this.shiftSummaryRepository.findOne({
      where: { deviceId, shiftDate: summaryDate, shiftType: 'night' },
    });

    if (!dayShift && !nightShift) {
      this.logger.warn(`⚠️ No shift data found for day: ${deviceId} ${summaryDate}`);
      return this.createEmptyDailySummary(deviceId, summaryDate);
    }

    // Lấy device info
    const device = await this.deviceRepository.findOne({
      where: { deviceId },
      relations: ['position', 'position.productionLine', 'position.productionLine.workshop'],
    });

    // Tính toán metrics từ 2 ca
    const dayShiftCount = dayShift?.totalCount || 0;
    const nightShiftCount = nightShift?.totalCount || 0;
    const totalCount = dayShiftCount + nightShiftCount;

    const dayShiftErrCount = dayShift?.totalErrCount || 0;
    const nightShiftErrCount = nightShift?.totalErrCount || 0;
    const totalErrCount = dayShiftErrCount + nightShiftErrCount;

    const errorRate = totalCount > 0 ? (totalErrCount / totalCount) * 100 : 0;

    // Tính trung bình RSSI, battery, temperature
    const shifts = [dayShift, nightShift].filter(s => s !== null);
    const avgRssi = shifts.length > 0
      ? Math.round(shifts.reduce((sum, s) => sum + (s!.avgRssi || 0), 0) / shifts.length)
      : undefined;

    const avgBattery = shifts.filter(s => s!.avgBattery).length > 0
      ? Math.round(
          shifts
            .filter(s => s!.avgBattery)
            .reduce((sum, s) => sum + s!.avgBattery!, 0) / 
          shifts.filter(s => s!.avgBattery).length
        )
      : undefined;

    const avgTemperature = shifts.filter(s => s!.avgTemperature).length > 0
      ? Math.round(
          shifts
            .filter(s => s!.avgTemperature)
            .reduce((sum, s) => sum + s!.avgTemperature!, 0) / 
          shifts.filter(s => s!.avgTemperature).length
        )
      : undefined;

    const messageCount = (dayShift?.messageCount || 0) + (nightShift?.messageCount || 0);

    // Tính production rate (sản phẩm/giờ) - 24 giờ
    const avgProductionRate = totalCount / 24;

    // Parse date info
    const date = new Date(summaryDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = date.getDay();
    
    // Tính week of year
    const firstDayOfYear = new Date(year, 0, 1);
    const daysSinceStart = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const weekOfYear = Math.ceil((daysSinceStart + firstDayOfYear.getDay() + 1) / 7);

    // Tạo hoặc update summary
    const summary = existing || this.dailySummaryRepository.create({
      deviceId,
      summaryDate,
      year,
      month,
      day,
      dayOfWeek,
      weekOfYear,
      positionId: device?.position?.id,
      productionLineId: device?.position?.productionLine?.id,
      workshopId: device?.position?.productionLine?.workshop?.id,
    });

    Object.assign(summary, {
      dayShiftCount,
      nightShiftCount,
      totalCount,
      dayShiftErrCount,
      nightShiftErrCount,
      totalErrCount,
      errorRate,
      avgRssi,
      avgBattery,
      avgTemperature,
      messageCount,
      avgProductionRate,
      status: 'completed',
      closedAt: new Date(),
      closedBy: 'system',
    });

    const saved = await this.dailySummaryRepository.save(summary);
    
    this.logger.log(
      `✅ Day closed: ${deviceId} ${summaryDate} - Total: ${totalCount} (Day: ${dayShiftCount}, Night: ${nightShiftCount})`
    );

    return saved;
  }

  /**
   * Tạo summary rỗng cho shift không có data
   */
  private async createEmptyShiftSummary(
    device: Device,
    shiftDate: string,
    shiftType: 'day' | 'night',
  ): Promise<ProductionShiftSummary> {
    const date = new Date(shiftDate);
    const { shiftStartAt, shiftEndAt } = getShiftBoundaries(date, shiftType);
    const shiftInfo = getShiftInfo(shiftStartAt);

    const summary = this.shiftSummaryRepository.create({
      deviceId: device.deviceId,
      shiftDate,
      shiftType,
      shiftNumber: shiftInfo.shiftNumber,
      shiftStartAt,
      shiftEndAt,
      positionId: device.position?.id,
      productionLineId: device.position?.productionLine?.id,
      workshopId: device.position?.productionLine?.workshop?.id,
      startCount: 0,
      endCount: 0,
      totalCount: 0,
      startErrCount: 0,
      endErrCount: 0,
      totalErrCount: 0,
      errorRate: 0,
      messageCount: 0,
      status: 'completed' as const,
      closedAt: new Date(),
      closedBy: 'system',
      notes: 'No data received during this shift',
    });

    return this.shiftSummaryRepository.save(summary);
  }

  /**
   * Tạo summary rỗng cho ngày không có data
   */
  private async createEmptyDailySummary(
    deviceId: string,
    summaryDate: string,
  ): Promise<ProductionDailySummary> {
    const date = new Date(summaryDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = date.getDay();
    
    const firstDayOfYear = new Date(year, 0, 1);
    const daysSinceStart = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const weekOfYear = Math.ceil((daysSinceStart + firstDayOfYear.getDay() + 1) / 7);

    const summary = this.dailySummaryRepository.create({
      deviceId,
      summaryDate,
      year,
      month,
      day,
      dayOfWeek,
      weekOfYear,
      dayShiftCount: 0,
      nightShiftCount: 0,
      totalCount: 0,
      dayShiftErrCount: 0,
      nightShiftErrCount: 0,
      totalErrCount: 0,
      errorRate: 0,
      messageCount: 0,
      status: 'completed',
      closedAt: new Date(),
      closedBy: 'system',
      notes: 'No data received during this day',
    });

    return this.dailySummaryRepository.save(summary);
  }

  /**
   * Manual: Chốt ca thủ công
   */
  async manualCloseShift(
    deviceId: string,
    shiftDate: string,
    shiftType: 'day' | 'night',
    closedBy: string,
  ): Promise<ProductionShiftSummary> {
    const summary = await this.closeShift(deviceId, shiftDate, shiftType);
    summary.closedBy = closedBy;
    return this.shiftSummaryRepository.save(summary);
  }

  /**
   * Manual: Chốt ngày thủ công
   */
  async manualCloseDay(
    deviceId: string,
    summaryDate: string,
    closedBy: string,
  ): Promise<ProductionDailySummary> {
    const summary = await this.closeDay(deviceId, summaryDate);
    summary.closedBy = closedBy;
    return this.dailySummaryRepository.save(summary);
  }

  /**
   * Cron job: Backup sản lượng mỗi giờ
   * Chạy vào phút 0 mỗi giờ (00:00, 01:00, 02:00, ...)
   * Lưu snapshot của tất cả dữ liệu sản lượng vào file JSON
   */
  @Cron('0 * * * *') // Mỗi giờ đúng
  async handleHourlyBackup() {
    const now = new Date();
    const backupDir = path.join(process.cwd(), 'backups', 'production');
    const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hourlyFolder = path.join(backupDir, dateFolder);
    
    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(hourlyFolder)) {
      fs.mkdirSync(hourlyFolder, { recursive: true });
    }
    
    const timestamp = now.toISOString().replace(/:/g, '-').split('.')[0]; // YYYY-MM-DDTHH-mm-ss
    const backupFile = path.join(hourlyFolder, `backup_${timestamp}.json`);
    
    try {
      this.logger.log(`🔄 Starting hourly backup at ${now.toISOString()}`);
      
      // Lấy tất cả dữ liệu cần backup
      const [shiftSummaries, dailySummaries, telemetryLogs] = await Promise.all([
        this.shiftSummaryRepository.find({
          order: { shiftDate: 'DESC', shiftType: 'ASC' },
          take: 100, // Lấy 100 records gần nhất
        }),
        this.dailySummaryRepository.find({
          order: { summaryDate: 'DESC' },
          take: 30, // Lấy 30 ngày gần nhất
        }),
        // Lấy telemetry logs của 24h gần nhất
        this.telemetryLogRepository
          .createQueryBuilder('log')
          .where('log.recordedAt >= :yesterday', { 
            yesterday: new Date(now.getTime() - 24 * 60 * 60 * 1000) 
          })
          .orderBy('log.recordedAt', 'DESC')
          .getMany(),
      ]);
      
      const backupData = {
        metadata: {
          backupTime: now.toISOString(),
          version: '1.0',
          recordCounts: {
            shiftSummaries: shiftSummaries.length,
            dailySummaries: dailySummaries.length,
            telemetryLogs: telemetryLogs.length,
          },
        },
        data: {
          shiftSummaries,
          dailySummaries,
          telemetryLogs,
        },
      };
      
      // Ghi file backup
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      const fileSizeKB = (fs.statSync(backupFile).size / 1024).toFixed(2);
      this.logger.log(`✅ Hourly backup completed: ${backupFile} (${fileSizeKB} KB)`);
      
      // Cleanup backup cũ (xóa folder > 30 ngày)
      await this.cleanupOldBackups(backupDir, 30);
      
    } catch (error) {
      this.logger.error(`❌ Hourly backup failed: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * Cron job: Archive backup hàng ngày
   * Chạy vào 23:59 mỗi ngày
   * Nén tất cả backup của ngày hiện tại thành 1 file .json duy nhất
   */
  @Cron('59 23 * * *') // 23:59 mỗi ngày
  async handleDailyArchive() {
    const now = new Date();
    const backupDir = path.join(process.cwd(), 'backups', 'production');
    const archiveDir = path.join(process.cwd(), 'backups', 'archives');
    const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const dailyFolder = path.join(backupDir, dateFolder);
    
    if (!fs.existsSync(dailyFolder)) {
      this.logger.warn(`⚠️ No backup folder found for ${dateFolder}`);
      return;
    }
    
    // Tạo thư mục archive nếu chưa có
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    try {
      this.logger.log(`📦 Creating daily archive for ${dateFolder}`);
      
      // Lấy tất cả dữ liệu của ngày hôm nay
      const [shiftSummaries, dailySummary] = await Promise.all([
        this.shiftSummaryRepository.find({
          where: { shiftDate: dateFolder },
        }),
        this.dailySummaryRepository.findOne({
          where: { summaryDate: dateFolder },
        }),
      ]);
      
      const archiveData = {
        metadata: {
          archiveDate: dateFolder,
          archivedAt: now.toISOString(),
          version: '1.0',
        },
        summary: {
          date: dateFolder,
          shifts: shiftSummaries.length,
          dailySummary: dailySummary || null,
        },
        data: {
          shiftSummaries,
          dailySummary,
        },
      };
      
      const archiveFile = path.join(archiveDir, `archive_${dateFolder}.json`);
      fs.writeFileSync(archiveFile, JSON.stringify(archiveData, null, 2));
      
      const fileSizeKB = (fs.statSync(archiveFile).size / 1024).toFixed(2);
      this.logger.log(`✅ Daily archive created: ${archiveFile} (${fileSizeKB} KB)`);
      
      // Xóa folder backup hourly sau khi đã archive
      if (fs.existsSync(dailyFolder)) {
        const files = fs.readdirSync(dailyFolder);
        files.forEach(file => fs.unlinkSync(path.join(dailyFolder, file)));
        fs.rmdirSync(dailyFolder);
        this.logger.log(`🗑️ Cleaned up hourly backups for ${dateFolder}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Daily archive failed: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * Xóa backup cũ hơn số ngày chỉ định
   */
  private async cleanupOldBackups(backupDir: string, retentionDays: number): Promise<void> {
    try {
      if (!fs.existsSync(backupDir)) {
        return;
      }
      
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
      
      const folders = fs.readdirSync(backupDir);
      let deletedCount = 0;
      
      for (const folder of folders) {
        const folderPath = path.join(backupDir, folder);
        const stats = fs.statSync(folderPath);
        
        if (stats.isDirectory() && folder.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const folderDate = new Date(folder);
          
          if (folderDate < cutoffDate) {
            // Xóa tất cả files trong folder
            const files = fs.readdirSync(folderPath);
            files.forEach(file => fs.unlinkSync(path.join(folderPath, file)));
            fs.rmdirSync(folderPath);
            deletedCount++;
          }
        }
      }
      
      if (deletedCount > 0) {
        this.logger.log(`🗑️ Cleaned up ${deletedCount} old backup folders (older than ${retentionDays} days)`);
      }
    } catch (error) {
      this.logger.error(`❌ Cleanup old backups failed: ${error.message}`);
    }
  }

  /**
   * Manual: Restore dữ liệu từ backup file
   */
  async restoreFromBackup(backupFilePath: string): Promise<{
    success: boolean;
    message: string;
    restored: {
      shiftSummaries: number;
      dailySummaries: number;
      telemetryLogs: number;
    };
  }> {
    try {
      this.logger.log(`🔄 Restoring from backup: ${backupFilePath}`);
      
      if (!fs.existsSync(backupFilePath)) {
        throw new Error('Backup file not found');
      }
      
      const backupContent = fs.readFileSync(backupFilePath, 'utf-8');
      const backupData = JSON.parse(backupContent);
      
      let restoredCounts = {
        shiftSummaries: 0,
        dailySummaries: 0,
        telemetryLogs: 0,
      };
      
      // Restore shift summaries
      if (backupData.data?.shiftSummaries) {
        for (const summary of backupData.data.shiftSummaries) {
          await this.shiftSummaryRepository.save(summary);
          restoredCounts.shiftSummaries++;
        }
      }
      
      // Restore daily summaries
      if (backupData.data?.dailySummaries) {
        for (const summary of backupData.data.dailySummaries) {
          await this.dailySummaryRepository.save(summary);
          restoredCounts.dailySummaries++;
        }
      }
      
      // Restore telemetry logs
      if (backupData.data?.telemetryLogs) {
        for (const log of backupData.data.telemetryLogs) {
          await this.telemetryLogRepository.save(log);
          restoredCounts.telemetryLogs++;
        }
      }
      
      this.logger.log(`✅ Restore completed: ${JSON.stringify(restoredCounts)}`);
      
      return {
        success: true,
        message: 'Data restored successfully',
        restored: restoredCounts,
      };
    } catch (error) {
      this.logger.error(`❌ Restore failed: ${error.message}`);
      return {
        success: false,
        message: error.message,
        restored: {
          shiftSummaries: 0,
          dailySummaries: 0,
          telemetryLogs: 0,
        },
      };
    }
  }
}
