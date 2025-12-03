import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ProductionLineRunsService } from './production-line-runs.service';
import { CreateProductionLineRunDto } from './dtos/create-production-line-run.dto';
import { UpdateProductionLineRunDto } from './dtos/update-production-line-run.dto';
import { QueryProductionLineRunDto } from './dtos/query-production-line-run.dto';

@Controller('production-line-runs')
export class ProductionLineRunsController {
    constructor(private readonly productionLineRunsService: ProductionLineRunsService) { }

    @Post()
    create(@Body() body: CreateProductionLineRunDto) {
        return this.productionLineRunsService.create(body);
    }

    @Get()
    findAll(@Query() query: QueryProductionLineRunDto) {
        return this.productionLineRunsService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.productionLineRunsService.findOne(id);
    }

    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateProductionLineRunDto,
    ) {
        return this.productionLineRunsService.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.productionLineRunsService.remove(id);
    }
}
