import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesMqttHandler } from './devices-mqtt.handler';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dtos/create-device.dto';
import { UpdateDeviceDto } from './dtos/update-device.dto';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';

@Controller('devices')
@UseGuards(AuthGuard, PermissionGuard)
export class DevicesController {
    constructor(
        private readonly devicesService: DevicesService,
        private readonly devicesMqttHandler: DevicesMqttHandler,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permission(PERMISSIONS.DEVICE_CREATE)
    create(@Body() createDeviceDto: CreateDeviceDto): Promise<Device> {
        return this.devicesService.create(createDeviceDto);
    }

    @Get()
    @Permission(PERMISSIONS.DEVICE_READ)
    findAll(): Promise<Device[]> {
        return this.devicesService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.DEVICE_READ)
    findOne(@Param('id') id: string): Promise<Device> {
        return this.devicesService.findOne(+id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.DEVICE_UPDATE)
    update(
        @Param('id') id: number,
        @Body() updateDeviceDto: UpdateDeviceDto,
    ): Promise<Device> {
        return this.devicesService.update(+id, updateDeviceDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.DEVICE_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string): Promise<void> {
        return this.devicesService.remove(+id);
    }

    /**
     * Get latest MQTT data for a specific device
     */
    @Get(':id/mqtt-data')
    getDeviceMqttData(@Param('id') id: string) {
        const data = this.devicesMqttHandler.getLatestDeviceData(id);
        return {
            deviceId: id,
            data: data || null,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get latest MQTT data for all devices
     */
    @Get('mqtt/all-data')
    getAllDevicesMqttData() {
        const allData = this.devicesMqttHandler.getAllDeviceData();
        return {
            devices: allData,
            count: Object.keys(allData).length,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get latest telemetry from database for all devices
     */
    @Get('telemetry/latest')
    getLatestTelemetry() {
        return this.devicesService.getLatestTelemetry();
    }

    /**
     * Get latest telemetry from database for a specific device
     */
    @Get(':deviceId/telemetry/latest')
    getDeviceLatestTelemetry(@Param('deviceId') deviceId: string) {
        return this.devicesService.getDeviceLatestTelemetry(deviceId);
    }

    /**
     * Clear MQTT cache
     */
    @Post('mqtt/clear-cache')
    @HttpCode(HttpStatus.OK)
    clearMqttCache() {
        this.devicesMqttHandler.clearCache();
        return {
            message: 'MQTT cache cleared successfully',
            timestamp: new Date().toISOString(),
        };
    }
}
