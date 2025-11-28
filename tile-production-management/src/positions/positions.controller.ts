import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { PositionsService } from './positions.service';
import { Position } from './entities/position.entity';
import { CreatePositionDto } from './dtos/create-position.dto';
import { UpdatePositionDto } from './dtos/update-position.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { UpdatePossitionIndexDto } from './dtos/update-position-index.dto';
import { ActivityEntityType, ActivityAction } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('positions')
@UseGuards(AuthGuard, PermissionGuard)
export class PositionsController {
    constructor(private readonly positionsService: PositionsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permission(PERMISSIONS.POSITION_CREATE)
    async create(@Body() createPositionDto: CreatePositionDto): Promise<LoggedResponse<Position>> {
        const position = await this.positionsService.create(createPositionDto);
        return {
            data: position,
            log: {
                action: 'CREATE_POSITION' as ActivityAction,
                actionType: 'CREATE_POSITION' as ActivityAction,
                entityType: ActivityEntityType.Position,
                description: `Tạo vị trí ${position.name}`,
                entityId: position.id,
                entityName: position.name,
            },
        };
    }

    @Get()
    @Permission(PERMISSIONS.POSITION_READ)
    async findAll(): Promise<Position[]> {
        return this.positionsService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.POSITION_READ)
    async findOne(@Param('id') id: string): Promise<Position> {
        return this.positionsService.findOne(+id);
    }

    @Patch(':id')
    @Permission(PERMISSIONS.POSITION_UPDATE)
    async update(
        @Param('id') id: string,
        @Body() updatePositionDto: UpdatePositionDto,
    ): Promise<LoggedResponse<Position>> {
        const position = await this.positionsService.update(+id, updatePositionDto);
        return {
            data: position,
            log: {
                action: 'UPDATE_POSITION' as ActivityAction,
                actionType: 'UPDATE_POSITION' as ActivityAction,
                entityType: ActivityEntityType.Position,
                description: `Cập nhật vị trí ${position.name}`,
                entityId: position.id,
                entityName: position.name,
            },
        };
    }

    @Patch(':id/index')
    @Permission(PERMISSIONS.POSITION_UPDATE)
    async updateIndex(
        @Param('id') id: string,
        @Body() updatePositionIndexDto: UpdatePossitionIndexDto,
    ): Promise<LoggedResponse<Position>> {
        const position = await this.positionsService.updateIndex(+id, updatePositionIndexDto);
        return {
            data: position,
            log: {
                action: 'UPDATE_POSITION_INDEX' as ActivityAction,
                actionType: 'UPDATE_POSITION_INDEX' as ActivityAction,
                entityType: ActivityEntityType.Position,
                description: `Cập nhật thứ tự hiển thị cho vị trí ${position.name}`,
                entityId: position.id,
                entityName: position.name,
            },
        };
    }

    @Delete(':id')
    @Permission(PERMISSIONS.POSITION_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string): Promise<LoggedResponse<null>> {
        await this.positionsService.remove(+id);
        return {
            data: null,
            log: {
                action: 'DELETE_POSITION' as ActivityAction,
                actionType: 'DELETE_POSITION' as ActivityAction,
                entityType: ActivityEntityType.Position,
                description: `Xoá vị trí id=${id}`,
                entityId: +id,
                entityName: undefined,
            },
        };
    }
}
