import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
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

        // --- TÍNH newIndex + CLAMP ---
        let newIndex = dto.index ?? oldIndex;

        // Chặn index < 1
        if (newIndex < 1) newIndex = 1;

        // Lấy maxIndex của line
        const maxIndex = await this.getMaxIndexOfLine(oldLineId);

        // Chặn index > maxIndex
        if (newIndex > maxIndex) newIndex = maxIndex;

        // --- LOGIC REORDER ---
        if (newIndex !== oldIndex) {
            const isIncrease = newIndex > oldIndex;

            if (isIncrease) {
                await this.positionRepository.decrement(
                    {
                        productionLine: { id: oldLineId },
                        index: Between(oldIndex + 1, newIndex),
                    },
                    'index',
                    1,
                );
            } else {
                await this.positionRepository.increment(
                    {
                        productionLine: { id: oldLineId },
                        index: Between(newIndex, oldIndex - 1),
                    },
                    'index',
                    1,
                );
            }
        }

        // Cập nhật các field khác
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

        const oldLineId = position.productionLine.id;
        const oldIndex = position.index;

        // --- TÍNH newIndex + CLAMP ---
        let newIndex = dto.index ?? oldIndex;

        if (newIndex < 1) newIndex = 1;

        const maxIndex = await this.getMaxIndexOfLine(oldLineId);
        if (newIndex > maxIndex) newIndex = maxIndex;

        // --- LOGIC REORDER ---
        if (newIndex !== oldIndex) {
            const isIncrease = newIndex > oldIndex;

            if (isIncrease) {
                await this.positionRepository.decrement(
                    {
                        productionLine: { id: oldLineId },
                        index: Between(oldIndex + 1, newIndex),
                    },
                    'index',
                    1,
                );
            } else {
                await this.positionRepository.increment(
                    {
                        productionLine: { id: oldLineId },
                        index: Between(newIndex, oldIndex - 1),
                    },
                    'index',
                    1,
                );
            }
        }

        Object.assign(position, dto, { index: newIndex });

        return this.positionRepository.save(position);
    }


    async remove(id: number): Promise<void> {
        const position = await this.findOne(id);
        const deviceCount = position.devices.length
        if (deviceCount > 0) throw new BadRequestException(`There are ${deviceCount} in this position`)

        await this.positionRepository.remove(position);
    }

    private async getMaxIndexOfLine(lineId: number): Promise<number> {
        const row = await this.positionRepository
            .createQueryBuilder('p')
            .select('MAX(p.index)', 'max')
            .where('p.productionLine = :lineId', { lineId })
            .getRawOne<{ max: string | null }>();

        const max = row?.max ? Number(row.max) : 0;
        // Nếu line chưa có position nào, mình cho max = 1 cho dễ xử lý
        return max > 0 ? max : 1;
    }
}
