import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrickType } from './entities/brick-type.entity';
import { CreateBrickTypeDto } from './dtos/create-brick-type.dto';
import { UpdateBrickTypeDto } from './dtos/update-brick-type.dto';

@Injectable()
export class BrickTypesService {
  constructor(
    @InjectRepository(BrickType)
    private brickTypeRepository: Repository<BrickType>,
  ) {}

  async create(createBrickTypeDto: CreateBrickTypeDto): Promise<BrickType> {
    const brickType = this.brickTypeRepository.create(createBrickTypeDto);
    return await this.brickTypeRepository.save(brickType);
  }

  async findAll(): Promise<BrickType[]> {
    return await this.brickTypeRepository.find();
  }

  async findOne(id: number): Promise<BrickType> {
    const brickType = await this.brickTypeRepository.findOne({
      where: { id },
    });

    if (!brickType) {
      throw new NotFoundException(`Brick type with ID ${id} not found`);
    }

    return brickType;
  }

  async update(
    id: number,
    updateBrickTypeDto: UpdateBrickTypeDto,
  ): Promise<BrickType> {
    const brickType = await this.findOne(id);
    Object.assign(brickType, updateBrickTypeDto);
    return await this.brickTypeRepository.save(brickType);
  }

  async remove(id: number): Promise<void> {
    const brickType = await this.findOne(id);
    await this.brickTypeRepository.remove(brickType);
  }
}
