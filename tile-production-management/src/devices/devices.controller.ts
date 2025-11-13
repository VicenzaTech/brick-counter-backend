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
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dtos/create-device.dto';
import { UpdateDeviceDto } from './dtos/update-device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDeviceDto: CreateDeviceDto): Promise<Device> {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  findAll(): Promise<Device[]> {
    return this.devicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Device> {
    return this.devicesService.findOne(+id);
  }

  @Put(':id')
  update(
    @Param('id') id: number,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ): Promise<Device> {
    return this.devicesService.update(+id, updateDeviceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.devicesService.remove(+id);
  }
}
