import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Production } from './entities/production.entity';
import { Device } from '../devices/entities/device.entity';
import { BrickType } from '../brick-types/entities/brick-type.entity';

export class CreateProductionDto {
  shift?: string;
  date: string;
  quantity: number;
  quality_passed?: number;
  errors?: number;
  notes?: string;
  deviceId: number;
  brickTypeId: number;
}

export class UpdateProductionDto {
  shift?: string;
  date?: string;
  quantity?: number;
  quality_passed?: number;
  errors?: number;
  notes?: string;
  deviceId?: number;
  brickTypeId?: number;
}

@Injectable()
export class ProductionsService {
  constructor(
    @InjectRepository(Production)
    private productionRepository: Repository<Production>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(BrickType)
    private brickTypeRepository: Repository<BrickType>,
  ) {}

  async create(createProductionDto: CreateProductionDto): Promise<Production> {
    // Check if device exists
    const device = await this.deviceRepository.findOne({
      where: { id: createProductionDto.deviceId },
    });

    if (!device) {
      throw new NotFoundException(
        `Device with ID ${createProductionDto.deviceId} not found`,
      );
    }

    // Check if brick type exists
    const brickType = await this.brickTypeRepository.findOne({
      where: { id: createProductionDto.brickTypeId },
    });

    if (!brickType) {
      throw new NotFoundException(
        `BrickType with ID ${createProductionDto.brickTypeId} not found`,
      );
    }

    const production = this.productionRepository.create({
      ...createProductionDto,
      device,
      brickType,
    });
    return await this.productionRepository.save(production);
  }

  async findAll(): Promise<Production[]> {
    return await this.productionRepository.find({
      relations: ['device', 'brickType'],
    });
  }

  async findOne(id: number): Promise<Production> {
    const production = await this.productionRepository.findOne({
      where: { id },
      relations: ['device', 'brickType'],
    });

    if (!production) {
      throw new NotFoundException(`Production with ID ${id} not found`);
    }

    return production;
  }

  async update(
    id: number,
    updateProductionDto: UpdateProductionDto,
  ): Promise<Production> {
    const production = await this.findOne(id);

    // If deviceId is being updated, validate it exists
    if (updateProductionDto.deviceId) {
      const device = await this.deviceRepository.findOne({
        where: { id: updateProductionDto.deviceId },
      });

      if (!device) {
        throw new NotFoundException(
          `Device with ID ${updateProductionDto.deviceId} not found`,
        );
      }
    }

    // If brickTypeId is being updated, validate it exists
    if (updateProductionDto.brickTypeId) {
      const brickType = await this.brickTypeRepository.findOne({
        where: { id: updateProductionDto.brickTypeId },
      });

      if (!brickType) {
        throw new NotFoundException(
          `BrickType with ID ${updateProductionDto.brickTypeId} not found`,
        );
      }
    }

    Object.assign(production, updateProductionDto);
    return await this.productionRepository.save(production);
  }

  async remove(id: number): Promise<void> {
    const production = await this.findOne(id);
    await this.productionRepository.remove(production);
  }
}
