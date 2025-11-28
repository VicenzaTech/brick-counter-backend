import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionStage } from './entities/production-stage.entity';
import { CreateProductionStageDto } from './dtos/create-production-stage.dto';
import { UpdateProductionStageDto } from './dtos/update-production-stage.dto';
import { UpdateProductionStageStatusDto } from './dtos/update-production-stage-status.dto';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { Position } from '../positions/entities/position.entity';

@Injectable()
export class ProductionStagesService {
    constructor(
        @InjectRepository(ProductionStage)
        private readonly productionStageRepo: Repository<ProductionStage>,
        @InjectRepository(ProductionLine)
        private readonly productionLineRepo: Repository<ProductionLine>,
        @InjectRepository(Position)
        private readonly positionRepo: Repository<Position>,
    ) { }

    async create(createDto: CreateProductionStageDto): Promise<ProductionStage> {
        // Check if production line exists
        const productionLine = await this.productionLineRepo.findOne({
            where: { id: createDto.productionLineId },
        });
        if (!productionLine) {
            throw new NotFoundException(
                `ProductionLine with ID ${createDto.productionLineId} not found`,
            );
        }

        // Create the production stage
        const stage = this.productionStageRepo.create({
            ...createDto,
            productionLine,
        });

        return await this.productionStageRepo.save(stage);
    }

    async findAll(): Promise<ProductionStage[]> {
        return this.productionStageRepo.find({
            relations: ['productionLine', 'positions'],
            order: { order: 'ASC' },
        });
    }

    async findOne(id: number): Promise<ProductionStage> {
        const stage = await this.productionStageRepo.findOne({
            where: { id },
            relations: ['productionLine', 'positions'],
        });

        if (!stage) {
            throw new NotFoundException(`ProductionStage with ID ${id} not found`);
        }

        return stage;
    }

    async update(
        id: number,
        updateDto: UpdateProductionStageDto,
    ): Promise<ProductionStage> {
        const stage = await this.productionStageRepo.findOne({
            where: { id },
            relations: ['productionLine', 'positions'],
        });

        if (!stage) {
            throw new NotFoundException(`ProductionStage with ID ${id} not found`);
        }

        // Handle production line update
        if ('productionLineId' in updateDto) {
            const productionLine = await this.productionLineRepo.findOne({
                where: { id: updateDto.productionLineId },
            });
            if (!productionLine) {
                throw new NotFoundException(
                    `ProductionLine with ID ${updateDto.productionLineId} not found`,
                );
            }
            stage.productionLine = productionLine;
        }

        // Update other fields
        Object.assign(stage, updateDto);

        return this.productionStageRepo.save(stage);
    }

    async remove(id: number): Promise<void> {
        const result = await this.productionStageRepo.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`ProductionStage with ID ${id} not found`);
        }
    }

    async findStagesByProductionLine(productionLineId: number): Promise<ProductionStage[]> {
        return this.productionStageRepo.find({
            where: { productionLine: { id: productionLineId } },
            relations: ['productionLine', 'positions'],
            order: { order: 'ASC' },
        });
    }

    async updateStatus(updateStatusDto: UpdateProductionStageStatusDto): Promise<ProductionStage> {
        // Find the stage by production line and name
        const stage = await this.productionStageRepo.findOne({
            where: {
                name: updateStatusDto.stageName,
                productionLine: { id: updateStatusDto.productionLineId }
            },
            relations: ['productionLine', 'positions']
        });

        if (!stage) {
            throw new NotFoundException(
                `Production stage '${updateStatusDto.stageName}' not found for production line ${updateStatusDto.productionLineId}`
            );
        }

        // Update status and other fields
        stage.status = updateStatusDto.status;

        // Update start time if provided
        if (updateStatusDto.startTime) {
            stage.startTime = new Date(updateStatusDto.startTime);
        } else if (updateStatusDto.status === 'in_progress' && !stage.startTime) {
            // Auto-set start time if status changes to in_progress and no start time is set
            stage.startTime = new Date();
        }

        // Update product ID if provided
        if (updateStatusDto.productId !== undefined) {
            stage.productId = updateStatusDto.productId;
        }

        return this.productionStageRepo.save(stage);
    }

    async getProductionStagesByProductionLineId(productionLineId: number) {
        // Find all production stages for the given production line ID
        const stages = await this.productionStageRepo.find({
            where: { productionLineId },
            order: { order: 'ASC' }, // Assuming you have an 'order' field to maintain stage sequence
            relations: ['productionLine'] // Include production line relation if needed
        });

        if (!stages || stages.length === 0) {
            throw new NotFoundException(`No production stages found for production line ID: ${productionLineId}`);
        }

        return stages;
    }
}
