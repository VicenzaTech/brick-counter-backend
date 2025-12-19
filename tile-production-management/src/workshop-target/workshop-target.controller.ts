import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkshopTargetService, WorkshopTargetListResponse, WorkshopTargetResponse } from './workshop-target.service';
import {
  CreateWorkshopTargetDto,
  UpdateWorkshopTargetDto,
  WorkshopTargetQueryDto,
} from './dtos/workshop-target.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { ActivityAction, ActivityEntityType } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('workshop-target')
@UseGuards(AuthGuard, PermissionGuard)
export class WorkshopTargetController {
  constructor(private readonly workshopTargetService: WorkshopTargetService) {}

  @Get()
  @Permission(PERMISSIONS.WORKSHOP_TARGET_READ)
  async findAll(@Query() query: WorkshopTargetQueryDto): Promise<WorkshopTargetListResponse> {
    return this.workshopTargetService.findAll(query);
  }

  @Get(':id')
  @Permission(PERMISSIONS.WORKSHOP_TARGET_READ)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<WorkshopTargetResponse> {
    return this.workshopTargetService.findOne(id);
  }

  @Post()
  @Permission(PERMISSIONS.WORKSHOP_TARGET_CREATE)
  async create(
    @Body() dto: CreateWorkshopTargetDto,
  ): Promise<LoggedResponse<WorkshopTargetResponse>> {
    const created = await this.workshopTargetService.create(dto);
    return {
      data: created,
      log: {
        action: 'CREATE_WORKSHOP_TARGET' as ActivityAction,
        actionType: 'CREATE_WORKSHOP_TARGET' as ActivityAction,
        entityType: ActivityEntityType.WorkshopTarget,
        description: `Tạo target nhà máy ${created.workshopName} năm ${created.year}`,
        entityId: created.id,
        entityName: created.name,
      },
    };
  }

  @Patch(':id')
  @Permission(PERMISSIONS.WORKSHOP_TARGET_UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkshopTargetDto,
  ): Promise<LoggedResponse<WorkshopTargetResponse>> {
    const { previous, current } = await this.workshopTargetService.update(id, dto);
    return {
      data: current,
      log: {
        action: 'UPDATE_WORKSHOP_TARGET' as ActivityAction,
        actionType: 'UPDATE_WORKSHOP_TARGET' as ActivityAction,
        entityType: ActivityEntityType.WorkshopTarget,
        description: `Cập nhật target nhà máy ${current.workshopName} năm ${current.year}`,
        entityId: current.id,
        entityName: current.name,
        meta: {
          before: previous,
          after: current,
        },
      },
    };
  }

  @Delete(':id')
  @Permission(PERMISSIONS.WORKSHOP_TARGET_DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<LoggedResponse<WorkshopTargetResponse>> {
    const removed = await this.workshopTargetService.remove(id);
    return {
      data: removed,
      log: {
        action: 'DELETE_WORKSHOP_TARGET' as ActivityAction,
        actionType: 'DELETE_WORKSHOP_TARGET' as ActivityAction,
        entityType: ActivityEntityType.WorkshopTarget,
        description: `Xóa target nhà máy ${removed.workshopName} năm ${removed.year}`,
        entityId: removed.id,
        entityName: removed.name,
      },
    };
  }
}
