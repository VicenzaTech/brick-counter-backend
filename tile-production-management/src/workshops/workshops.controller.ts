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
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dtos/create-workshop.dto';
import { UpdateWorkshopDto } from './dtos/update-workshop.dto'; import type { Workshop } from './entities/workshop.entity';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { ActivityEntityType, ActivityAction } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('workshops')
@UseGuards(AuthGuard, PermissionGuard)
export class WorkshopsController {
    constructor(private readonly workshopsService: WorkshopsService) { }

    @Post()
    @Permission(PERMISSIONS.WORKSHOP_CREATE)
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createWorkshopDto: CreateWorkshopDto): Promise<LoggedResponse<Workshop>> {
        const workshop = await this.workshopsService.create(createWorkshopDto);
        return {
            data: workshop,
            log: {
                action: 'CREATE_WORKSHOP' as ActivityAction,
                actionType: 'CREATE_WORKSHOP' as ActivityAction,
                entityType: ActivityEntityType.Workshop,
                description: `Tạo phân xưởng ${workshop.name}`,
                entityId: workshop.id,
                entityName: workshop.name,
            },
        };
    }

    @Get()
    @Permission(PERMISSIONS.WORKSHOP_READ)
    async findAll(): Promise<Workshop[]> {
        return this.workshopsService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.WORKSHOP_READ)
    async findOne(@Param('id') id: string): Promise<Workshop> {
        return this.workshopsService.findOne(+id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.WORKSHOP_UPDATE)
    async update(
        @Param('id') id: number,
        @Body() updateWorkshopDto: UpdateWorkshopDto,
    ): Promise<LoggedResponse<Workshop>> {
        const workshop = await this.workshopsService.update(+id, updateWorkshopDto);
        return {
            data: workshop,
            log: {
                action: 'UPDATE_WORKSHOP' as ActivityAction,
                actionType: 'UPDATE_WORKSHOP' as ActivityAction,
                entityType: ActivityEntityType.Workshop,
                description: `Cập nhật phân xưởng ${workshop.name}`,
                entityId: workshop.id,
                entityName: workshop.name,
            },
        };
    }

    @Delete(':id')
    @Permission(PERMISSIONS.WORKSHOP_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string): Promise<LoggedResponse<null>> {
        await this.workshopsService.remove(+id);
        return {
            data: null,
            log: {
                action: 'DELETE_WORKSHOP' as ActivityAction,
                actionType: 'DELETE_WORKSHOP' as ActivityAction,
                entityType: ActivityEntityType.Workshop,
                description: `Xoá phân xưởng id=${id}`,
                entityId: +id,
                entityName: undefined,
            },
        };
    }
}
