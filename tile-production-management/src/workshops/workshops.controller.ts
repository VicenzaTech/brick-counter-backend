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
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dtos/create-workshop.dto';
import { UpdateWorkshopDto } from './dtos/update-workshop.dto';import type { Workshop } from './entities/workshop.entity';

@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createWorkshopDto: CreateWorkshopDto): Promise<Workshop> {
    return this.workshopsService.create(createWorkshopDto);
  }

  @Get()
  findAll(): Promise<Workshop[]> {
    return this.workshopsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Workshop> {
    return this.workshopsService.findOne(+id);
  }

  @Put(':id')
  update(
    @Param('id') id: number,
    @Body() updateWorkshopDto: UpdateWorkshopDto,
  ): Promise<Workshop> {
    return this.workshopsService.update(+id, updateWorkshopDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.workshopsService.remove(+id);
  }
}
