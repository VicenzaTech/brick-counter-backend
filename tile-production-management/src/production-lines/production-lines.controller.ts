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
    UseGuards,
} from '@nestjs/common';
import { ProductionLinesService } from './production-lines.service';
import { ProductionLine } from './entities/production-line.entity';
import { CreateProductionLineDto } from './dtos/create-production-line.dto';
import { UpdateProductionLineDto } from './dtos/update-production-line.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('production-lines')
@UseGuards(AuthGuard, PermissionGuard)
export class ProductionLinesController {
    constructor(private readonly productionLinesService: ProductionLinesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permission(PERMISSIONS.PRODUCTION_LINE_UPDATE)
    create(@Body() createProductionLineDto: CreateProductionLineDto): Promise<ProductionLine> {
        return this.productionLinesService.create(createProductionLineDto);
    }

    @Get()
    @Permission(PERMISSIONS.PRODUCTION_LINE_READ)
    findAll(): Promise<ProductionLine[]> {
        return this.productionLinesService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.PRODUCTION_LINE_READ)
    findOne(@Param('id') id: string): Promise<ProductionLine> {
        return this.productionLinesService.findOne(+id);
    }

    @Patch(':id')
    @Permission(PERMISSIONS.PRODUCTION_LINE_UPDATE)
    update(
        @Param('id') id: string,
        @Body() updateProductionLineDto: UpdateProductionLineDto,
    ): Promise<Partial<ProductionLine>> {
        return this.productionLinesService.update(+id, updateProductionLineDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.PRODUCTION_LINE_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string): Promise<void> {
        return this.productionLinesService.remove(+id);
    }
}
