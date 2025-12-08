import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ProductionLineRunsService } from './production-line-runs.service';
import { CreateProductionLineRunDto } from './dtos/create-production-line-run.dto';
import { UpdateProductionLineRunDto } from './dtos/update-production-line-run.dto';
import { QueryProductionLineRunDto } from './dtos/query-production-line-run.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('production-line-runs')
@UseGuards(AuthGuard, PermissionGuard)
export class ProductionLineRunsController {
    constructor(private readonly productionLineRunsService: ProductionLineRunsService) { }

    @Post()
    @Permission(PERMISSIONS.PRODUCTION_LINE_RUN_CREATE)
    create(@Body() body: CreateProductionLineRunDto) {
        return this.productionLineRunsService.create(body);
    }

    @Get()
    @Permission(PERMISSIONS.PRODUCTION_LINE_RUN_READ)
    findAll(@Query() query: QueryProductionLineRunDto) {
        return this.productionLineRunsService.findAll(query);
    }

    @Get(':id')
    @Permission(PERMISSIONS.PRODUCTION_LINE_RUN_READ)
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.productionLineRunsService.findOne(id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.PRODUCTION_LINE_RUN_UPDATE)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateProductionLineRunDto,
    ) {
        return this.productionLineRunsService.update(id, body);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.PRODUCTION_LINE_RUN_DELETE)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.productionLineRunsService.remove(id);
    }
}
