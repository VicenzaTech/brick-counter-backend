import { Controller, Post, Param, Body, Logger, ParseIntPipe, UseGuards } from '@nestjs/common';
import { DeviceCommandService, CommandResponse } from '../services/device-command.service';
import { ActivityAction, ActivityEntityType } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('mqtt/device-command')
@UseGuards(AuthGuard, PermissionGuard)
export class DeviceCommandController {
  private readonly logger = new Logger(DeviceCommandController.name);

  constructor(private readonly deviceCommandService: DeviceCommandService) {}

  /**
   * Reset all devices on a production line
   * POST /mqtt/device-command/reset-line/1
   */
  @Post('reset-counter/:clusterId')
  @Permission(PERMISSIONS.DEVICE_COMMAND_EXECUTE)
  async resetCounterCluster(
    @Param('clusterId', ParseIntPipe) clusterId: number,
  ): Promise<LoggedResponse<CommandResponse>> {
    this.logger.log(`REST API: Reset cluster ${clusterId}`);
    const result = await this.deviceCommandService.resetCounterCluster(clusterId);
    return {
      data: result,
      log: {
        action: 'RESET_CLUSTER_COUNTER' as ActivityAction,
        actionType: 'RESET_CLUSTER_COUNTER' as ActivityAction,
        entityType: ActivityEntityType.DeviceCluster,
        description: `Reset bộ đếm cho cụm thiết bị ${clusterId}`,
        entityId: clusterId,
      },
    };
  }

  /**
   * Reset all devices on a production line
   * POST /mqtt/device-command/reset-line/1
   */
  @Post('reset-line/:lineId')
  @Permission(PERMISSIONS.DEVICE_COMMAND_EXECUTE)
  async resetLine(
    @Param('lineId', ParseIntPipe) lineId: number,
  ): Promise<LoggedResponse<CommandResponse>> {
    this.logger.log(`REST API: Reset production line ${lineId}`);
    const result = await this.deviceCommandService.resetProductionLine(lineId);
    return {
      data: result,
      log: {
        action: 'RESET_LINE_COUNTER' as ActivityAction,
        actionType: 'RESET_LINE_COUNTER' as ActivityAction,
        entityType: ActivityEntityType.ProductionLine,
        description: `Reset bộ đếm trên dây chuyền ${lineId}`,
        entityId: lineId,
      },
    };
  }

  /**
   * Reset specific device
   * POST /mqtt/device-command/reset-device/SAU-ME-01
   */
  @Post('reset-device/:deviceId')
  @Permission(PERMISSIONS.DEVICE_COMMAND_EXECUTE)
  async resetDevice(
    @Param('deviceId') deviceId: string,
  ): Promise<LoggedResponse<CommandResponse>> {
    this.logger.log(`REST API: Reset device ${deviceId}`);
    const result = await this.deviceCommandService.resetDevice(deviceId);
    return {
      data: result,
      log: {
        action: 'RESET_DEVICE_COUNTER' as ActivityAction,
        actionType: 'RESET_DEVICE_COUNTER' as ActivityAction,
        entityType: ActivityEntityType.Device,
        description: `Reset bộ đếm của thiết bị ${deviceId}`,
        entityName: deviceId,
      },
    };
  }

  /**
   * Set device counter value
   * POST /mqtt/device-command/set-device/:deviceId
   * Body: { value: number }
   */
  @Post('set-device/:deviceId')
  @Permission(PERMISSIONS.DEVICE_COMMAND_EXECUTE)
  async setDevice(
    @Param('deviceId') deviceId: string,
    @Body('value', ParseIntPipe) value: number,
  ): Promise<LoggedResponse<CommandResponse>> {
    this.logger.log(`REST API: Set device ${deviceId} to value ${value}`);
    const result = await this.deviceCommandService.setDeviceValue(deviceId, value);
    return {
      data: result,
      log: {
        action: 'SET_DEVICE_COUNTER' as ActivityAction,
        actionType: 'SET_DEVICE_COUNTER' as ActivityAction,
        entityType: ActivityEntityType.Device,
        description: `Gán lại bộ đếm của thiết bị ${deviceId} về giá trị ${value}`,
        entityName: deviceId,
        meta: { value },
      },
    };
  }

  /**
   * Emergency stop production line
   * POST /mqtt/device-command/emergency-stop/1
   */
  @Post('emergency-stop/:lineId')
  @Permission(PERMISSIONS.DEVICE_COMMAND_EXECUTE)
  async emergencyStop(
    @Param('lineId', ParseIntPipe) lineId: number,
  ): Promise<LoggedResponse<CommandResponse>> {
    this.logger.warn(`REST API: Emergency stop for line ${lineId}`);
    const result = await this.deviceCommandService.emergencyStopLine(lineId);
    return {
      data: result,
      log: {
        action: 'EMERGENCY_STOP_LINE' as ActivityAction,
        actionType: 'EMERGENCY_STOP_LINE' as ActivityAction,
        entityType: ActivityEntityType.ProductionLine,
        description: `Dừng khẩn cấp dây chuyền ${lineId}`,
        entityId: lineId,
      },
    };
  }

  /**
   * Configure device settings
   * POST /mqtt/device-command/config-device/:deviceId
   * Body: { interval: number } - Telemetry interval in seconds (5, 10, 15, 30, 60)
   */
  @Post('config-device/:deviceId')
  @Permission(PERMISSIONS.DEVICE_COMMAND_EXECUTE)
  async configDevice(
    @Param('deviceId') deviceId: string,
    @Body('interval', ParseIntPipe) interval: number,
  ): Promise<LoggedResponse<CommandResponse>> {
    this.logger.log(`REST API: Configure device ${deviceId}, interval: ${interval}s`);
    const result = await this.deviceCommandService.configureDevice(deviceId, interval);
    return {
      data: result,
      log: {
        action: 'CONFIG_DEVICE' as ActivityAction,
        actionType: 'CONFIG_DEVICE' as ActivityAction,
        entityType: ActivityEntityType.Device,
        description: `Cấu hình thiết bị ${deviceId}, chu kỳ gửi dữ liệu ${interval}s`,
        entityName: deviceId,
        meta: { interval },
      },
    };
  }

  /**
   * Configure all devices on a production line
   * POST /mqtt/device-command/config-line/:lineId
   * Body: { interval: number } - Telemetry interval in seconds (5, 10, 15, 30, 60)
   */
  @Post('config-line/:lineId')
  @Permission(PERMISSIONS.DEVICE_COMMAND_EXECUTE)
  async configLine(
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body('interval', ParseIntPipe) interval: number,
  ): Promise<LoggedResponse<CommandResponse>> {
    this.logger.log(`REST API: Configure production line ${lineId}, interval: ${interval}s`);
    const result = await this.deviceCommandService.configureProductionLine(lineId, interval);
    return {
      data: result,
      log: {
        action: 'CONFIG_LINE' as ActivityAction,
        actionType: 'CONFIG_LINE' as ActivityAction,
        entityType: ActivityEntityType.ProductionLine,
        description: `Cấu hình dây chuyền ${lineId}, chu kỳ gửi dữ liệu ${interval}s`,
        entityId: lineId,
        meta: { interval },
      },
    };
  }
}
