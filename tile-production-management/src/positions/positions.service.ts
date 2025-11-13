import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './entities/position.entity';
import { CreatePositionDto } from './dtos/create-position.dto';
import { UpdatePositionDto } from './dtos/update-position.dto';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
  ) {}

  async create(createPositionDto: CreatePositionDto): Promise<Position> {
    const position = this.positionRepository.create(createPositionDto);
    return await this.positionRepository.save(position);
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

  async update(
    id: number,
    updatePositionDto: UpdatePositionDto,
  ): Promise<Position> {
    const position = await this.findOne(id);
    Object.assign(position, updatePositionDto);
    return await this.positionRepository.save(position);
  }

  async remove(id: number): Promise<void> {
    const position = await this.findOne(id);
    await this.positionRepository.remove(position);
  }
}
