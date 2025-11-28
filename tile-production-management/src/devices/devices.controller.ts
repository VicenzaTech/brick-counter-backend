import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
    UseGuards,
    Patch,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dtos/create-device.dto';
import { UpdateDeviceDto } from './dtos/update-device.dto';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { ActivityEntityType, ActivityAction } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('devices')
@UseGuards(AuthGuard, PermissionGuard)
export class DevicesController {
    constructor(
        private readonly devicesService: DevicesService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permission(PERMISSIONS.DEVICE_CREATE)
    async create(@Body() createDeviceDto: CreateDeviceDto): Promise<LoggedResponse<Device>> {
        const device = await this.devicesService.create(createDeviceDto);
        return {
            data: device,
            log: {
                action: 'CREATE_DEVICE' as ActivityAction,
                actionType: 'CREATE_DEVICE' as ActivityAction,
                entityType: ActivityEntityType.Device,
                description: `Tạo thiết bị ${device.name}`,
                entityId: device.id,
                entityName: device.name,
            },
        };
    }

    @Get()
    @Permission(PERMISSIONS.DEVICE_READ)
    async findAll(): Promise<Device[]> {
        return this.devicesService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.DEVICE_READ)
    async findOne(@Param('id') id: string): Promise<Device> {
        return this.devicesService.findOne(+id);
    }

    @Patch(':id')
    @Permission(PERMISSIONS.DEVICE_UPDATE)
    async update(
        @Param('id') id: number,
        @Body() updateDeviceDto: UpdateDeviceDto,
    ): Promise<LoggedResponse<Device>> {
        return this.devicesService.update(+id, updateDeviceDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.DEVICE_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string): Promise<LoggedResponse<null>> {
        await this.devicesService.remove(+id);
        return {
            data: null,
            log: {
                action: 'DELETE_DEVICE' as ActivityAction,
                actionType: 'DELETE_DEVICE' as ActivityAction,
                entityType: ActivityEntityType.Device,
                description: `Xóa thiết bị id=${id}`,
                entityId: +id,
                entityName: undefined,
            },
        };
    }

    /**
     * Get latest MQTT data for a specific device
     */
    // @Get(':id/mqtt-data')
    // getDeviceMqttData(@Param('id') id: string) {
    //     const data = this.devicesMqttHandler.getLatestDeviceData(id);
    //     return {
    //         deviceId: id,
    //         data: data || null,
    //         timestamp: new Date().toISOString(),
    //     };
    // }

    /**
     * Get latest MQTT data for all devices
     */
    // @Get('mqtt/all-data')
    // getAllDevicesMqttData() {
    //     const allData = this.devicesMqttHandler.getAllDeviceData();
    //     return {
    //         devices: allData,
    //         count: Object.keys(allData).length,
    //         timestamp: new Date().toISOString(),
    //     };
    // }

    /**
     * Get latest telemetry from database for all devices
     */
    @Get('telemetry/latest')
    @Permission(PERMISSIONS.DEVICE_READ)
    getLatestTelemetry() {
        return this.devicesService.getLatestTelemetry();
    }

    /**
     * Get latest telemetry from database for a specific device
     */
    @Get(':deviceId/telemetry/latest')
    @Permission(PERMISSIONS.DEVICE_READ)
    getDeviceLatestTelemetry(@Param('deviceId') deviceId: string) {
        return this.devicesService.getDeviceLatestTelemetry(deviceId);
    }

    /**
     * Reset Device
     */
    @Post(':deviceId/checkStatus')
    @Permission(PERMISSIONS.DEVICE_UPDATE)
    async checkDeviceOnline(@Param('deviceId') id: number): Promise<LoggedResponse<any>> {
        const result = await this.devicesService.checkDeviceOnline(id);
        return {
            data: result,
            log: {
                action: 'TEST_DEVICE_CONNECTION' as ActivityAction,
                actionType: 'TEST_DEVICE_CONNECTION' as ActivityAction,
                entityType: ActivityEntityType.Device,
                description: `Kiểm tra trạng thái online của thiết bị id=${id}`,
                entityId: +id,
                entityName: undefined,
            },
        };
    }
}

