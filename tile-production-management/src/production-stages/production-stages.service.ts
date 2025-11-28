import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionStage } from './entities/production-stage.entity';
import { CreateProductionStageDto } from './dtos/create-production-stage.dto';
import { UpdateProductionStageDto } from './dtos/update-production-stage.dto';
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
}
