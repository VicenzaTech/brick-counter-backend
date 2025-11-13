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
import { ProductionsService, CreateProductionDto, UpdateProductionDto } from './productions.service';
import { Production } from './entities/production.entity';

@Controller('productions')
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductionDto: CreateProductionDto): Promise<Production> {
    return this.productionsService.create(createProductionDto);
  }

  @Get()
  findAll(): Promise<Production[]> {
    return this.productionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Production> {
    return this.productionsService.findOne(+id);
  }

  @Put(':id')
  update(
    @Param('id') id: number,
    @Body() updateProductionDto: UpdateProductionDto,
  ): Promise<Production> {
    return this.productionsService.update(+id, updateProductionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.productionsService.remove(+id);
  }
}
