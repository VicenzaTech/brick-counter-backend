import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workshop } from './entities/workshop.entity';
import { CreateWorkshopDto } from './dtos/create-workshop.dto';
import { UpdateWorkshopDto } from './dtos/update-workshop.dto';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private workshopRepository: Repository<Workshop>,
  ) {}

  async create(createWorkshopDto: CreateWorkshopDto): Promise<Workshop> {
    const workshop = this.workshopRepository.create(createWorkshopDto);
    return await this.workshopRepository.save(workshop);
  }

  async findAll(): Promise<Workshop[]> {
    return await this.workshopRepository.find({
      relations: ['lines'],
    });
  }

  async findOne(id: number): Promise<Workshop> {
    const workshop = await this.workshopRepository.findOne({
      where: { id },
      relations: ['lines'],
    });

    if (!workshop) {
      throw new NotFoundException(`Workshop with ID ${id} not found`);
    }

    return workshop;
  }

  async update(
    id: number,
    updateWorkshopDto: UpdateWorkshopDto,
  ): Promise<Workshop> {
    const workshop = await this.findOne(id);
    Object.assign(workshop, updateWorkshopDto);
    return await this.workshopRepository.save(workshop);
  }

  async remove(id: number): Promise<void> {
    const workshop = await this.findOne(id);
    await this.workshopRepository.remove(workshop);
  }
}
