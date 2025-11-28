import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionLine } from './entities/production-line.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { CreateProductionLineDto } from './dtos/create-production-line.dto';
import { UpdateProductionLineDto } from './dtos/update-production-line.dto';
import { REDIS_PROVIDER } from 'src/common/redis/redis.constant';
import Redis from 'ioredis';
import { LoggedResponse } from 'src/common/type/log.response';
import { ActivityAction, ActivityEntityType } from 'src/activity-log/entities/activity-log.enum';

@Injectable()
export class ProductionLinesService {
    constructor(
        @InjectRepository(ProductionLine)
        private productionLineRepository: Repository<ProductionLine>,
        @InjectRepository(Workshop)
        private workshopRepository: Repository<Workshop>,

        @Inject(REDIS_PROVIDER)
        private readonly redis: Redis,
    ) { }
    // config cache here

    async create(createProductionLineDto: CreateProductionLineDto): Promise<ProductionLine> {
        // Check if workshop exists
        const workshop = await this.workshopRepository.findOne({
            where: { id: createProductionLineDto.workshopId },
        });

        if (!workshop) {
            throw new NotFoundException(
                `Workshop with ID ${createProductionLineDto.workshopId} not found`,
            );
        }

        const productionLine = this.productionLineRepository.create({
            ...createProductionLineDto,
            workshop,
        });
        return await this.productionLineRepository.save(productionLine);
    }

    async findAll(): Promise<ProductionLine[]> {
        return await this.productionLineRepository.find({
            relations: ['positions', 'activeBrickType', 'positions.devices'],
        });
    }

    async findOne(id: number): Promise<ProductionLine> {
        const productionLine = await this.productionLineRepository.findOne({
            where: { id },
            relations: ['positions', 'activeBrickType', 'positions.devices'],
        });

        if (!productionLine) {
            throw new NotFoundException(`Production line with ID ${id} not found`);
        }

        return productionLine;
    }

    async findProductionLineByWorkshopId(workshopId: number) {
        const productionLine = await this.productionLineRepository.find({
            where: {
                workshop: {
                    id: workshopId
                }
            },
            relations: ['positions', 'devices'],
        })
        // config cache here

        return productionLine
    }

    async update(
        id: number,
        updateProductionLineDto: UpdateProductionLineDto,
    ): Promise<LoggedResponse<Partial<ProductionLine>>> {
        const productionLine = await this.findOne(id);
        const before = { ...productionLine };
        Object.assign(productionLine, updateProductionLineDto);
        const updated = await this.productionLineRepository.save(productionLine);
        if (!updated) throw new ForbiddenException();
        const payload = {
            id: updated.id,
            name: updated.name,
            description: updated.description,
        };
        return {
            data: payload,
            log: {
                action: 'UPDATE_PRODUCTION_LINE' as ActivityAction,
                actionType: 'UPDATE_PRODUCTION_LINE' as ActivityAction,
                entityType: ActivityEntityType.ProductionLine,
                description: `Cập nhật dây chuyền sản xuất id=${id}`,
                entityId: updated.id,
                entityName: updated.name,
                meta: {
                    before,
                    after: payload,
                },
            },
        };
    }

    async remove(id: number): Promise<void> {
        const productionLine = await this.findOne(id);
        await this.productionLineRepository.remove(productionLine);
    }

}
