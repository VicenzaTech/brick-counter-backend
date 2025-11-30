import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Put,
    Delete,
    Query,
    ParseIntPipe,
    UsePipes,
    ValidationPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductionStagesService } from './production-stages.service';
import { CreateProductionStageDto } from './dtos/create-production-stage.dto';
import { UpdateProductionStageDto } from './dtos/update-production-stage.dto';
import { UpdateProductionStageStatusDto } from './dtos/update-production-stage-status.dto';
import { ProductionStage } from './entities/production-stage.entity';
import { Req } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';

@ApiTags('production-stages')
@Controller('production-stages')
export class ProductionStagesController {
    constructor(private readonly stagesService: ProductionStagesService) { }

    @Post()
    @UsePipes(new ValidationPipe())
    async create(@Body() createDto: CreateProductionStageDto): Promise<ProductionStage> {
        return this.stagesService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all production stages' })
    @ApiResponse({ status: 200, description: 'Return all production stages.', type: [ProductionStage] })
    async findAll(): Promise<ProductionStage[]> {
        return this.stagesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a production stage by ID' })
    @ApiResponse({ status: 200, description: 'Return the production stage.', type: ProductionStage })
    @ApiResponse({ status: 404, description: 'Production stage not found.' })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductionStage> {
        return this.stagesService.findOne(id);
    }

    @Get('by-production-line/:productionLineId')
    @ApiOperation({ summary: 'Get all production stages by production line ID' })
    @ApiResponse({ status: 200, description: 'Return production stages for the specified production line.', type: [ProductionStage] })
    async findByProductionLine(
        @Param('productionLineId', ParseIntPipe) productionLineId: number,
    ): Promise<ProductionStage[]> {
        return this.stagesService.findStagesByProductionLine(productionLineId);
    }

    @Put(':id')
    @UsePipes(new ValidationPipe())
    @ApiOperation({ summary: 'Update a production stage' })
    @ApiResponse({ status: 200, description: 'The production stage has been successfully updated.', type: ProductionStage })
    @ApiResponse({ status: 404, description: 'Production stage not found.' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateProductionStageDto,
    ): Promise<ProductionStage> {
        return this.stagesService.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a production stage' })
    @ApiResponse({ status: 200, description: 'The production stage has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Production stage not found.' })
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.stagesService.remove(id);
    }

    @Post('update-status')
    @UsePipes(new ValidationPipe())
    @ApiOperation({ summary: 'Update production stage status' })
    @ApiResponse({ status: 200, description: 'The production stage status has been successfully updated.', type: ProductionStage })
    @ApiResponse({ status: 404, description: 'Production stage not found.' })
    async updateStatus(
        @Body() updateStatusDto: UpdateProductionStageStatusDto,
    ): Promise<ProductionStage> {
        return this.stagesService.updateStatus(updateStatusDto);
    }

    @Get('by-production-line-id/:productionLineId')
    @ApiOperation({ summary: 'Get production stages by production line ID' })
    @ApiResponse({
        status: 200,
        description: 'Returns all production stages for the specified production line',
        type: [ProductionStage]
    })
    @ApiResponse({
        status: 404,
        description: 'No production stages found for the specified production line'
    })
    async getByProductionLineId(
        @Param('productionLineId', ParseIntPipe) productionLineId: number
    ): Promise<ProductionStage[]> {
        return this.stagesService.getProductionStagesByProductionLineId(productionLineId);
    }
}
