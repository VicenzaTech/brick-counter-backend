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
import { BrickTypesService } from './brick-types.service';
import { CreateBrickTypeDto } from './dtos/create-brick-type.dto';
import { UpdateBrickTypeDto } from './dtos/update-brick-type.dto';
import type { BrickType } from './entities/brick-type.entity';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { PERMISSIONS } from 'src/users/permission.constant';
import { ActivityEntityType, ActivityAction } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('brick-types')
@UseGuards(AuthGuard, PermissionGuard)
export class BrickTypesController {
    constructor(private readonly brickTypesService: BrickTypesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permission(PERMISSIONS.BRICK_TYPE_CREATE)
    async create(@Body() createBrickTypeDto: CreateBrickTypeDto): Promise<LoggedResponse<BrickType>> {
        const brickType = await this.brickTypesService.create(createBrickTypeDto);
        return {
            data: brickType,
            log: {
                action: 'CREATE_BRICK_TYPE' as ActivityAction,
                actionType: 'CREATE_BRICK_TYPE' as ActivityAction,
                entityType: ActivityEntityType.BrickType,
                description: `Tạo loại gạch ${brickType.name}`,
                entityId: brickType.id,
                entityName: brickType.name,
            },
        };
    }

    @Get()
    @Permission(PERMISSIONS.BRICK_TYPE_READ)
    async findAll(): Promise<BrickType[]> {
        return this.brickTypesService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.BRICK_TYPE_READ)
    async findOne(@Param('id') id: string): Promise<BrickType> {
        return this.brickTypesService.findOne(+id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.BRICK_TYPE_UPDATE)
    async update(
        @Param('id') id: string,
        @Body() updateBrickTypeDto: UpdateBrickTypeDto,
    ): Promise<LoggedResponse<BrickType>> {
        return this.brickTypesService.update(+id, updateBrickTypeDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.BRICK_TYPE_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string): Promise<LoggedResponse<null>> {
        await this.brickTypesService.remove(+id);
        return {
            data: null,
            log: {
                action: 'DELETE_BRICK_TYPE' as ActivityAction,
                actionType: 'DELETE_BRICK_TYPE' as ActivityAction,
                entityType: ActivityEntityType.BrickType,
                description: `Xóa loại gạch id=${id}`,
                entityId: +id,
                entityName: undefined,
            },
        };
    }

    @Get('active/all')
    @Permission(PERMISSIONS.BRICK_TYPE_UPDATE)
    async findAllActive(): Promise<BrickType[]> {
        return this.brickTypesService.findAllActive();
    }

    @Get('active/production-line/:lineId')
    @Permission(PERMISSIONS.PRODUCTION_LINE_READ)
    async findByProductionLine(@Param('lineId') lineId: string): Promise<BrickType[]> {
        return this.brickTypesService.findByProductionLine(+lineId);
    }

    @Put(':id/activate')
    @Permission(PERMISSIONS.PRODUCTION_LINE_UPDATE)
    async setActive(
        @Param('id') id: string,
        @Body() body: { productionLineId: number; status?: 'producing' | 'paused' },
    ): Promise<LoggedResponse<BrickType>> {
        const brickType = await this.brickTypesService.setActive(+id, body.productionLineId, body.status);
        return {
            data: brickType,
            log: {
                action: 'ENABLE_BRICK_TYPE' as ActivityAction,
                actionType: 'ENABLE_BRICK_TYPE' as ActivityAction,
                entityType: ActivityEntityType.BrickType,
                description: `Kích hoạt loại gạch ${brickType.name} trên dây chuyền ${body.productionLineId}`,
                entityId: brickType.id,
                entityName: brickType.name,
            },
        };
    }

    @Put(':id/deactivate')
    @Permission(PERMISSIONS.PRODUCTION_LINE_UPDATE)
    async setInactive(
        @Param('id') id: string,
        @Body() body: { productionLineId: number },
    ): Promise<LoggedResponse<BrickType>> {
        const brickType = await this.brickTypesService.setInactive(+id, body.productionLineId);
        return {
            data: brickType,
            log: {
                action: 'DISABLE_BRICK_TYPE' as ActivityAction,
                actionType: 'DISABLE_BRICK_TYPE' as ActivityAction,
                entityType: ActivityEntityType.BrickType,
                description: `Ngừng kích hoạt loại gạch ${brickType.name} trên dây chuyền ${body.productionLineId}`,
                entityId: brickType.id,
                entityName: brickType.name,
            },
        };
    }
}

