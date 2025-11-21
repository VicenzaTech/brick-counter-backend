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

@Controller('measurement-types')
@UseGuards(AuthGuard, PermissionGuard)
export class MeasurementTypesController {
  constructor(
    private readonly measurementTypesService: MeasurementTypesService,
  ) {}

  @Post()
  @Permission(PERMISSIONS.DEVICE_CREATE)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateMeasurementTypeDto,
  ): Promise<MeasurementType> {
    return this.measurementTypesService.create(dto);
  }

  @Get()
  @Permission(PERMISSIONS.DEVICE_READ)
  findAll(): Promise<MeasurementType[]> {
    return this.measurementTypesService.findAll();
  }

  @Get(':id')
  @Permission(PERMISSIONS.DEVICE_READ)
  findOne(@Param('id') id: string): Promise<MeasurementType> {
    return this.measurementTypesService.findOne(+id);
  }

  @Patch(':id')
  @Permission(PERMISSIONS.DEVICE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMeasurementTypeDto,
  ): Promise<MeasurementType> {
    return this.measurementTypesService.update(+id, dto);
  }

  @Delete(':id')
  @Permission(PERMISSIONS.DEVICE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.measurementTypesService.remove(+id);
  }
}

