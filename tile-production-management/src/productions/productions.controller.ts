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
import { ProductionsService, CreateProductionDto, UpdateProductionDto } from './productions.service';
import { Production } from './entities/production.entity';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('productions')
@UseGuards(AuthGuard, PermissionGuard)
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission(PERMISSIONS.PRODUCTION_CREATE)
  create(@Body() createProductionDto: CreateProductionDto): Promise<Production> {
    return this.productionsService.create(createProductionDto);
  }

  @Get()
  @Permission(PERMISSIONS.PRODUCTION_READ)
  findAll(): Promise<Production[]> {
    return this.productionsService.findAll();
  }

  @Get(':id')
  @Permission(PERMISSIONS.PRODUCTION_READ)
  findOne(@Param('id') id: string): Promise<Production> {
    return this.productionsService.findOne(+id);
  }

  @Put(':id')
  @Permission(PERMISSIONS.PRODUCTION_UPDATE)
  update(
    @Param('id') id: number,
    @Body() updateProductionDto: UpdateProductionDto,
  ): Promise<Production> {
    return this.productionsService.update(+id, updateProductionDto);
  }

  @Delete(':id')
  @Permission(PERMISSIONS.PRODUCTION_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.productionsService.remove(+id);
  }
}
