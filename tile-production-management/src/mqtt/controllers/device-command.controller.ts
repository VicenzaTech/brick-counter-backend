import { Controller, Post, Param, Body, Logger, ParseIntPipe } from '@nestjs/common';
import { DeviceCommandService, CommandResponse } from '../services/device-command.service';

@Controller('mqtt/device-command')
export class DeviceCommandController {
  private readonly logger = new Logger(DeviceCommandController.name);

  constructor(private readonly deviceCommandService: DeviceCommandService) {}

  /**
   * Reset all devices on a production line
   * POST /mqtt/device-command/reset-line/1
   */
  @Post('reset-line/:lineId')
  async resetLine(
    @Param('lineId', ParseIntPipe) lineId: number,
  ): Promise<CommandResponse> {
    this.logger.log(`REST API: Reset production line ${lineId}`);
    return this.deviceCommandService.resetProductionLine(lineId);
  }

  /**
   * Reset specific device
   * POST /mqtt/device-command/reset-device/SAU-ME-01
   */
  @Post('reset-device/:deviceId')
  async resetDevice(
    @Param('deviceId') deviceId: string,
  ): Promise<CommandResponse> {
    this.logger.log(`REST API: Reset device ${deviceId}`);
    return this.deviceCommandService.resetDevice(deviceId);
  }

  /**
   * Set device counter value
   * POST /mqtt/device-command/set-device/:deviceId
   * Body: { value: number }
   */
  @Post('set-device/:deviceId')
  async setDevice(
    @Param('deviceId') deviceId: string,
    @Body('value', ParseIntPipe) value: number,
  ): Promise<CommandResponse> {
    this.logger.log(`REST API: Set device ${deviceId} to value ${value}`);
    return this.deviceCommandService.setDeviceValue(deviceId, value);
  }

  /**
   * Emergency stop production line
   * POST /mqtt/device-command/emergency-stop/1
   */
  @Post('emergency-stop/:lineId')
  async emergencyStop(
    @Param('lineId', ParseIntPipe) lineId: number,
  ): Promise<CommandResponse> {
    this.logger.warn(`REST API: Emergency stop for line ${lineId}`);
    return this.deviceCommandService.emergencyStopLine(lineId);
  }

  /**
   * Configure device settings
   * POST /mqtt/device-command/config-device/:deviceId
   * Body: { interval: number } - Telemetry interval in seconds (5, 10, 15, 30, 60)
   */
  @Post('config-device/:deviceId')
  async configDevice(
    @Param('deviceId') deviceId: string,
    @Body('interval', ParseIntPipe) interval: number,
  ): Promise<CommandResponse> {
    this.logger.log(`REST API: Configure device ${deviceId}, interval: ${interval}s`);
    return this.deviceCommandService.configureDevice(deviceId, interval);
  }

  /**
   * Configure all devices on a production line
   * POST /mqtt/device-command/config-line/:lineId
   * Body: { interval: number } - Telemetry interval in seconds (5, 10, 15, 30, 60)
   */
  @Post('config-line/:lineId')
  async configLine(
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body('interval', ParseIntPipe) interval: number,
  ): Promise<CommandResponse> {
    this.logger.log(`REST API: Configure production line ${lineId}, interval: ${interval}s`);
    return this.deviceCommandService.configureProductionLine(lineId, interval);
  }
}
