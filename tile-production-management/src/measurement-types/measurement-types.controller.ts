import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MeasurementTypesService } from './measurement-types.service';
import type { MeasurementType } from './entities/measurement-types.entity';
import { CreateMeasurementTypeDto } from './dtos/create-measurement-type.dto';
import { UpdateMeasurementTypeDto } from './dtos/update-measurement-type.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { ActivityEntityType, ActivityAction } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('measurement-types')
@UseGuards(AuthGuard, PermissionGuard)
export class MeasurementTypesController {
  constructor(
    private readonly measurementTypesService: MeasurementTypesService,
  ) {}

  @Post()
  @Permission(PERMISSIONS.DEVICE_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateMeasurementTypeDto,
  ): Promise<LoggedResponse<MeasurementType>> {
    const mt = await this.measurementTypesService.create(dto);
    return {
      data: mt,
      log: {
        action: 'CREATE_MEASUREMENT_TYPE' as ActivityAction,
        actionType: 'CREATE_MEASUREMENT_TYPE' as ActivityAction,
        entityType: ActivityEntityType.MeasurementType,
        description: `Tạo loại phép đo ${mt.name}`,
        entityId: mt.id,
        entityName: mt.name,
      },
    };
  }

  @Get()
  @Permission(PERMISSIONS.DEVICE_READ)
  async findAll(): Promise<MeasurementType[]> {
    return this.measurementTypesService.findAll();
  }

  @Get(':id')
  @Permission(PERMISSIONS.DEVICE_READ)
  async findOne(@Param('id') id: string): Promise<MeasurementType> {
    return this.measurementTypesService.findOne(+id);
  }

  @Patch(':id')
  @Permission(PERMISSIONS.DEVICE_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMeasurementTypeDto,
  ): Promise<LoggedResponse<MeasurementType>> {
    const mt = await this.measurementTypesService.update(+id, dto);
    return {
      data: mt,
      log: {
        action: 'UPDATE_MEASUREMENT_TYPE' as ActivityAction,
        actionType: 'UPDATE_MEASUREMENT_TYPE' as ActivityAction,
        entityType: ActivityEntityType.MeasurementType,
        description: `Cập nhật loại phép đo ${mt.name}`,
        entityId: mt.id,
        entityName: mt.name,
      },
    };
  }

  @Delete(':id')
  @Permission(PERMISSIONS.DEVICE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<LoggedResponse<null>> {
    await this.measurementTypesService.remove(+id);
    return {
      data: null,
      log: {
        action: 'DELETE_MEASUREMENT_TYPE' as ActivityAction,
        actionType: 'DELETE_MEASUREMENT_TYPE' as ActivityAction,
        entityType: ActivityEntityType.MeasurementType,
        description: `Xoá loại phép đo id=${id}`,
        entityId: +id,
        entityName: undefined,
      },
    };
  }
}

