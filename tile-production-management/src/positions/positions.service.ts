import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './entities/position.entity';
import { CreatePositionDto } from './dtos/create-position.dto';
import { UpdatePositionDto } from './dtos/update-position.dto';
import { UpdatePossitionIndexDto } from './dtos/update-position-index.dto';

@Injectable()
export class PositionsService {
    constructor(
        @InjectRepository(Position)
        private positionRepository: Repository<Position>,
    ) { }

    async create(createPositionDto: CreatePositionDto): Promise<Position> {
        const { productionLineId } = createPositionDto;

        const lastPos = await this.positionRepository.findOne({
            where: { productionLine: { id: productionLineId } },
            order: { index: 'DESC' },
            select: { index: true },
        });

        const nextIndex = createPositionDto.index ?? (lastPos ? lastPos.index + 1 : 1);

        const position = this.positionRepository.create({
            ...createPositionDto,
            index: nextIndex,
        });

        return this.positionRepository.save(position);
    }


    async findAll(): Promise<Position[]> {
        return await this.positionRepository.find({
            relations: ['productionLine', 'devices'],
        });
    }

    async findOne(id: number): Promise<Position> {
        const position = await this.positionRepository.findOne({
            where: { id },
            relations: ['productionLine', 'devices'],
        });

        if (!position) {
            throw new NotFoundException(`Position with ID ${id} not found`);
        }

        return position;
    }

    async update(id: number, dto: UpdatePositionDto): Promise<Position> {
        const position = await this.positionRepository.findOne({
            where: { id },
            relations: ['productionLine'],
        });

        if (!position) throw new NotFoundException('Position not found');

        const oldLineId = position.productionLine.id;
        const oldIndex = position.index;
        const newIndex = dto.index ?? oldIndex;

        // Không thay đổi production line, chỉ thay đổi index (và thông tin mô tả)
        if (newIndex !== oldIndex) {
            const isIncrease = newIndex > oldIndex;

            if (isIncrease) {
                await this.positionRepository
                    .createQueryBuilder()
                    .update()
                    .set({ index: () => `"index" - 1"` })
                    .where(`"productionLineId" = :line`, { line: oldLineId })
                    .andWhere(`"index" > :oldIndex`, { oldIndex })
                    .andWhere(`"index" <= :newIndex`, { newIndex })
                    .execute();
            } else {
                await this.positionRepository
                    .createQueryBuilder()
                    .update()
                    .set({ index: () => `"index" + 1"` })
                    .where(`"productionLineId" = :line`, { line: oldLineId })
                    .andWhere(`"index" < :oldIndex`, { oldIndex })
                    .andWhere(`"index" >= :newIndex`, { newIndex })
                    .execute();
            }
        }

        // Cập nhật name / description / coordinates, giữ nguyên productionLine
        Object.assign(position, {
            name: dto.name ?? position.name,
            description: dto.description ?? position.description,
            coordinates: dto.coordinates ?? position.coordinates,
            index: newIndex,
        });

        return this.positionRepository.save(position);
    }

    async updateIndex(id: number, dto: UpdatePossitionIndexDto) {
        const position = await this.positionRepository.findOne({
            where: { id },
            relations: ['productionLine'],
        });

        if (!position) throw new NotFoundException('Position not found');
        const oldLineId = position.productionLine.id
        const oldIndex = position.index;
        const newIndex = dto.index ?? oldIndex;
        if (newIndex !== oldIndex) {
            const isIncrease = newIndex > oldIndex;

            if (isIncrease) {
                await this.positionRepository
                    .createQueryBuilder()
                    .update()
                    .set({ index: () => `"index" - 1"` })
                    .where(`"productionLineId" = :line`, { line: oldLineId })
                    .andWhere(`"index" > :oldIndex`, { oldIndex })
                    .andWhere(`"index" <= :newIndex`, { newIndex })
                    .execute();
            } else {
                await this.positionRepository
                    .createQueryBuilder()
                    .update()
                    .set({ index: () => `"index" + 1"` })
                    .where(`"productionLineId" = :line`, { line: oldLineId })
                    .andWhere(`"index" < :oldIndex`, { oldIndex })
                    .andWhere(`"index" >= :newIndex`, { newIndex })
                    .execute();
            }
        }

        Object.assign(position, dto, { index: newIndex });

        return this.positionRepository.save(position);
    }

    async remove(id: number): Promise<void> {
        const position = await this.findOne(id);
        await this.positionRepository.remove(position);
    }
}
