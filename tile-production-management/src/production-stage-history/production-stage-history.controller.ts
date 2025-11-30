import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe, DefaultValuePipe, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProductionStageHistoryService } from './production-stage-history.service';
import { CreateProductionStageHistoryDto } from './dtos/create-production-stage-history.dto';
import { UpdateProductionStageHistoryDto } from './dtos/update-production-stage-history.dto';

@Controller('production-stage-history')
export class ProductionStageHistoryController {
	constructor(private readonly historyService: ProductionStageHistoryService) {}

	@Post()
	@UsePipes(new ValidationPipe())
	async create(@Body() createDto: CreateProductionStageHistoryDto) {
		return this.historyService.create(createDto);
	}

	@Get()
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

	@Get(':id')
	async findOne(@Param('id', ParseIntPipe) id: number) {
		return this.historyService.findOne(id);
	}

	@Put(':id')
	@UsePipes(new ValidationPipe())
	async update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateDto: UpdateProductionStageHistoryDto
	) {
		return this.historyService.update(id, updateDto);
	}

	@Delete(':id')
	async remove(@Param('id', ParseIntPipe) id: number) {
		return this.historyService.remove(id);
	}
    
	/**
	 * Update the latest history record for a given stageId and productId (where endTime is null)
	 * Body: { stageId, productId, ...updateDto }
	 */
	@Put('update-latest')
	@UsePipes(new ValidationPipe())
	async updateLatest(@Body() body: any) {
		const { stageId, productId, ...updateDto } = body;
		console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~", body)
		if (!stageId || !productId) {
			throw new Error('stageId and productId are required');
		}
		return this.historyService.updateLatest(stageId, productId, updateDto);
	}
}
