import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe, DefaultValuePipe, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { ProductionStageHistoryService } from './production-stage-history.service';
import { CreateProductionStageHistoryDto } from './dtos/create-production-stage-history.dto';
import { UpdateProductionStageHistoryDto } from './dtos/update-production-stage-history.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('production-stage-history')
@UseGuards(AuthGuard, PermissionGuard)
export class ProductionStageHistoryController {
    constructor(private readonly historyService: ProductionStageHistoryService) { }

    @Post()
    @Permission(PERMISSIONS.PRODUCTION_STAGE_HISTORY_CREATE)
    @UsePipes(new ValidationPipe())
    async create(@Body() createDto: CreateProductionStageHistoryDto) {
        return this.historyService.create(createDto);
    }

    @Get()
    @Permission(PERMISSIONS.PRODUCTION_STAGE_HISTORY_READ)
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
        @Query('stageId') stageId?: number,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('stopReason') stopReason?: string,
    ) {
        return this.historyService.findAll(
            page,
            limit,
            stageId ? Number(stageId) : undefined,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
            stopReason as any
        );
    }

    /**
     * Update the latest history record for a given stageId and productId (where endTime is null)
     * Body: { stageId, productId, ...updateDto }
     */
    @Put('update-latest')
    @Permission(PERMISSIONS.PRODUCTION_STAGE_HISTORY_UPDATE)
    async updateLatest(@Body() body: any) {
        const { stageId, productId, ...updateDto } = body;
        if (!stageId || !productId) {
            throw new Error('stageId and productId are required');
        }
        return this.historyService.updateLatest(stageId, productId, updateDto);
    }

    @Get('by-production-line/:productionLineId')
    @Permission(PERMISSIONS.PRODUCTION_STAGE_HISTORY_READ)
    async findByProductionLine(
        @Param('productionLineId', ParseIntPipe) productionLineId: number,
    ) {
        return this.historyService.findStagesByProductionLine(productionLineId);
    }


    @Get('by-production-line-with-filter/:productionLineId')
    @Permission(PERMISSIONS.PRODUCTION_STAGE_HISTORY_READ)
    async findByProductionLinePagination(
        @Param('productionLineId') productionLineId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('stage') stageName?: string,
    ) {
        return this.historyService.findStageByProductionLineWithFilter(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
            stageName as any,
            productionLineId
        );
    }

    @Get(':id')
    @Permission(PERMISSIONS.PRODUCTION_STAGE_HISTORY_READ)
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.historyService.findOne(id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.PRODUCTION_STAGE_HISTORY_UPDATE)
    @UsePipes(new ValidationPipe())
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateProductionStageHistoryDto
    ) {
        return this.historyService.update(id, updateDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.PRODUCTION_STAGE_HISTORY_DELETE)
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.historyService.remove(id);
    }
}
