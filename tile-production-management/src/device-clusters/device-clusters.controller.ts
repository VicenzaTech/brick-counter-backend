import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { DeviceClustersService } from './device-clusters.service';
import type { DeviceCluster } from './entities/device-cluster.entity';
import { CreateDeviceClusterDto } from './dtos/create-device-cluster.dto';
import { UpdateDeviceClusterDto } from './dtos/update-device-cluster.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { ActivityEntityType, ActivityAction } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('device-clusters')
@UseGuards(AuthGuard, PermissionGuard)
export class DeviceClustersController {
    constructor(private readonly deviceClustersService: DeviceClustersService) { }

    @Post()
    @Permission(PERMISSIONS.DEVICE_CREATE)
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() dto: CreateDeviceClusterDto,
    ): Promise<LoggedResponse<DeviceCluster>> {
        const cluster = await this.deviceClustersService.create(dto);
        return {
            data: cluster,
            log: {
                action: 'CREATE_DEVICE_CLUSTER' as ActivityAction,
                actionType: 'CREATE_DEVICE_CLUSTER' as ActivityAction,
                entityType: ActivityEntityType.DeviceCluster,
                description: `Tạo cụm thiết bị ${cluster.name}`,
                entityId: cluster.id,
                entityName: cluster.name,
            },
        };
    }

    @Get()
    @Permission(PERMISSIONS.DEVICE_READ)
    async findAll(): Promise<DeviceCluster[]> {
        return this.deviceClustersService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.DEVICE_READ)
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<DeviceCluster> {
        return this.deviceClustersService.findOne(+id);
    }

    @Get('/line/:productionLineId')
    @Permission(PERMISSIONS.DEVICE_READ)
    async findAllByLineId(@Param('productionLineId', ParseIntPipe) id: number): Promise<any> {
        return this.deviceClustersService.findAllByLineId(+id);
    }

    @Patch(':id')
    @Permission(PERMISSIONS.DEVICE_UPDATE)
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDeviceClusterDto,
    ): Promise<LoggedResponse<DeviceCluster>> {
        const cluster = await this.deviceClustersService.update(+id, dto);
        return {
            data: cluster,
            log: {
                action: 'UPDATE_DEVICE_CLUSTER' as ActivityAction,
                actionType: 'UPDATE_DEVICE_CLUSTER' as ActivityAction,
                entityType: ActivityEntityType.DeviceCluster,
                description: `Cập nhật cụm thiết bị ${cluster.name}`,
                entityId: cluster.id,
                entityName: cluster.name,
            },
        };
    }

    @Delete(':id')
    @Permission(PERMISSIONS.DEVICE_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string): Promise<LoggedResponse<null>> {
        await this.deviceClustersService.remove(+id);
        return {
            data: null,
            log: {
                action: 'DELETE_DEVICE_CLUSTER' as ActivityAction,
                actionType: 'DELETE_DEVICE_CLUSTER' as ActivityAction,
                entityType: ActivityEntityType.DeviceCluster,
                description: `Xoá cụm thiết bị id=${id}`,
                entityId: +id,
                entityName: undefined,
            },
        };
    }
}
