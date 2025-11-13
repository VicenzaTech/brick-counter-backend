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
import { ProductionLinesService } from './production-lines.service';
import { ProductionLine } from './entities/production-line.entity';
import { CreateProductionLineDto } from './dtos/create-production-line.dto';
import { UpdateProductionLineDto } from './dtos/update-production-line.dto';

@Controller('production-lines')
export class ProductionLinesController {
  constructor(private readonly productionLinesService: ProductionLinesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductionLineDto: CreateProductionLineDto): Promise<ProductionLine> {
    return this.productionLinesService.create(createProductionLineDto);
  }

  @Get()
  findAll(): Promise<ProductionLine[]> {
    return this.productionLinesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ProductionLine> {
    return this.productionLinesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductionLineDto: UpdateProductionLineDto,
  ): Promise<ProductionLine> {
    return this.productionLinesService.update(+id, updateProductionLineDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.productionLinesService.remove(+id);
  }
}
