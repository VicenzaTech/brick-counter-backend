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

@Controller('device-clusters')
@UseGuards(AuthGuard, PermissionGuard)
export class DeviceClustersController {
    constructor(private readonly deviceClustersService: DeviceClustersService) { }

    @Post()
    @Permission(PERMISSIONS.DEVICE_CREATE)
    @HttpCode(HttpStatus.CREATED)
    create(
        @Body() dto: CreateDeviceClusterDto,
    ): Promise<DeviceCluster> {
        return this.deviceClustersService.create(dto);
    }

    @Get()
    @Permission(PERMISSIONS.DEVICE_READ)
    findAll(): Promise<DeviceCluster[]> {
        return this.deviceClustersService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.DEVICE_READ)
    findOne(@Param('id', ParseIntPipe) id: number): Promise<DeviceCluster> {
        return this.deviceClustersService.findOne(+id);
    }

    @Patch(':id')
    @Permission(PERMISSIONS.DEVICE_UPDATE)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDeviceClusterDto,
    ): Promise<DeviceCluster> {
        return this.deviceClustersService.update(+id, dto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.DEVICE_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string): Promise<void> {
        return this.deviceClustersService.remove(+id);
    }
}
