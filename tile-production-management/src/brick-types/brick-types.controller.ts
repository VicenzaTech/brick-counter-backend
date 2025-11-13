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
import { BrickTypesService } from './brick-types.service';
import { CreateBrickTypeDto } from './dtos/create-brick-type.dto';
import { UpdateBrickTypeDto } from './dtos/update-brick-type.dto';
import type { BrickType } from './entities/brick-type.entity';

@Controller('brick-types')
export class BrickTypesController {
  constructor(private readonly brickTypesService: BrickTypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createBrickTypeDto: CreateBrickTypeDto): Promise<BrickType> {
    return this.brickTypesService.create(createBrickTypeDto);
  }

  @Get()
  findAll(): Promise<BrickType[]> {
    return this.brickTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<BrickType> {
    return this.brickTypesService.findOne(+id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateBrickTypeDto: UpdateBrickTypeDto,
  ): Promise<BrickType> {
    return this.brickTypesService.update(+id, updateBrickTypeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.brickTypesService.remove(+id);
  }
}
