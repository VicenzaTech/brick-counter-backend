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
} from '@nestjs/common';
import { PositionsService } from './positions.service';
import { Position } from './entities/position.entity';
import { CreatePositionDto } from './dtos/create-position.dto';
import { UpdatePositionDto } from './dtos/update-position.dto';

@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPositionDto: CreatePositionDto): Promise<Position> {
    return this.positionsService.create(createPositionDto);
  }

  @Get()
  findAll(): Promise<Position[]> {
    return this.positionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Position> {
    return this.positionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePositionDto: UpdatePositionDto,
  ): Promise<Position> {
    return this.positionsService.update(+id, updatePositionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.positionsService.remove(+id);
  }
}
