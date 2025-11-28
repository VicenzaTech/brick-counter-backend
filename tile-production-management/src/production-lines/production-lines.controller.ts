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
import { ActivityEntityType, ActivityAction } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('production-lines')
@UseGuards(AuthGuard, PermissionGuard)
export class ProductionLinesController {
    constructor(private readonly productionLinesService: ProductionLinesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permission(PERMISSIONS.PRODUCTION_LINE_UPDATE)
    async create(@Body() createProductionLineDto: CreateProductionLineDto): Promise<LoggedResponse<ProductionLine>> {
        const line = await this.productionLinesService.create(createProductionLineDto);
        return {
            data: line,
            log: {
                action: 'CREATE_PRODUCTION_LINE' as ActivityAction,
                actionType: 'CREATE_PRODUCTION_LINE' as ActivityAction,
                entityType: ActivityEntityType.ProductionLine,
                description: `Tạo dây chuyền sản xuất ${line.name}`,
                entityId: line.id,
                entityName: line.name,
            },
        };
    }

    @Get()
    @Permission(PERMISSIONS.PRODUCTION_LINE_READ)
    async findAll(): Promise<ProductionLine[]> {
        return this.productionLinesService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.PRODUCTION_LINE_READ)
    async findOne(@Param('id') id: string): Promise<ProductionLine> {
        return this.productionLinesService.findOne(+id);
    }

    @Patch(':id')
    @Permission(PERMISSIONS.PRODUCTION_LINE_UPDATE)
    async update(
        @Param('id') id: string,
        @Body() updateProductionLineDto: UpdateProductionLineDto,
    ): Promise<LoggedResponse<Partial<ProductionLine>>> {
        const line = await this.productionLinesService.update(+id, updateProductionLineDto);
        return {
            data: line,
            log: {
                action: 'UPDATE_PRODUCTION_LINE' as ActivityAction,
                actionType: 'UPDATE_PRODUCTION_LINE' as ActivityAction,
                entityType: ActivityEntityType.ProductionLine,
                description: `Cập nhật dây chuyền sản xuất id=${id}`,
                entityId: +id,
                entityName: (line as any)?.name,
            },
        };
    }

    @Delete(':id')
    @Permission(PERMISSIONS.PRODUCTION_LINE_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string): Promise<LoggedResponse<null>> {
        await this.productionLinesService.remove(+id);
        return {
            data: null,
            log: {
                action: 'DELETE_PRODUCTION_LINE' as ActivityAction,
                actionType: 'DELETE_PRODUCTION_LINE' as ActivityAction,
                entityType: ActivityEntityType.ProductionLine,
                description: `Xoá dây chuyền sản xuất id=${id}`,
                entityId: +id,
                entityName: undefined,
            },
        };
    }
}
