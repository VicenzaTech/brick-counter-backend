import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionStage } from './entities/production-stage.entity';
import { CreateProductionStageDto } from './dtos/create-production-stage.dto';
import { UpdateProductionStageDto } from './dtos/update-production-stage.dto';
import { UpdateProductionStageStatusDto } from './dtos/update-production-stage-status.dto';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { Position } from '../positions/entities/position.entity';
import { ActivityLogService } from 'src/activity-log/activity-log.service';
import { ActivityAction, ActivityEntityType, ActivitySource } from 'src/activity-log/entities/activity-log.enum';
import { LogDTO } from 'src/activity-log/dto/log.dto';
import { ActivityStatus, ActivitySeverity } from 'src/activity-log/entities/activity-log.enum';
import { BrickType } from '../brick-types/entities/brick-type.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ProductionStagesService {
    constructor(
        @InjectRepository(ProductionStage)
        private readonly productionStageRepo: Repository<ProductionStage>,
        @InjectRepository(ProductionLine)
        private readonly productionLineRepo: Repository<ProductionLine>,
        @InjectRepository(Position)
        private readonly positionRepo: Repository<Position>,
        @InjectRepository(BrickType)
        private readonly brickTypeRepo: Repository<BrickType>,

        private readonly activityLogService: ActivityLogService,
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

        // Convert trạng thái sang text tiếng Việt
        const statusTextMap: Record<string, string> = {
            pending: 'Đang tạm dừng',
            running: 'Đang sản xuất',
            waiting_log: 'Chờ chốt sản lượng',
        };
        const oldStatusText = statusTextMap[stage.status] || stage.status;
        const newStatusText = statusTextMap[updateStatusDto.status] || updateStatusDto.status;

        // Lấy tên dòng sản phẩm từ productId nếu có
        let productName = '';
        if (updateStatusDto.productId) {
            const brickType = await this.brickTypeRepo.findOne({ where: { id: updateStatusDto.productId } });
            productName = brickType ? brickType.name : `${updateStatusDto.productId}`;
        }

        const logDto = new LogDTO();
        logDto.action = 'UPDATE';
        //TODO: Set user ID
            // logDto.userId = user.id;
        //
        logDto.actionType = 'UPDATE_PRODUCTION_STAGE_STATUS';
        logDto.entityType = ActivityEntityType.ProductionStage;
        logDto.description = `Cập nhật trạng thái công đoạn '${stage.name}' cho dây chuyền ${stage.productionLineId}` +
          (productName ? ` áp dụng cho dòng sản phẩm ${productName}` : '') +
          ` từ ${oldStatusText} thành ${newStatusText}`;
        logDto.entityId = stage.id;
        logDto.status = ActivityStatus.SUCCESS;
        logDto.severity = ActivitySeverity.INFO;
        logDto.source = ActivitySource.WEB_APP;

        // Update status and other fields
        stage.status = updateStatusDto.status;

        // Update start time if provided
        if (updateStatusDto.startTime) {
            stage.startTime = new Date(updateStatusDto.startTime);
        } else if (updateStatusDto.status === 'running' && !stage.startTime) {
            // Auto-set start time if status changes to running and no start time is set
            stage.startTime = new Date();
        }

        // Update product ID if provided
        if (updateStatusDto.productId !== undefined) {
            stage.productId = updateStatusDto.productId;
        }

        await this.activityLogService.log(logDto);
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
