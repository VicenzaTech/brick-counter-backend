
 
// src/production-stage-history/production-stage-history.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, IsNull } from 'typeorm';
import { ProductionStageHistory } from './entities/production-stage-history.entity';
import { CreateProductionStageHistoryDto } from './dtos/create-production-stage-history.dto';
import { UpdateProductionStageHistoryDto } from './dtos/update-production-stage-history.dto';
import { StopReason } from './entities/production-stage-history.entity';

@Injectable()
export class ProductionStageHistoryService {
  constructor(
    @InjectRepository(ProductionStageHistory)
    private readonly historyRepository: Repository<ProductionStageHistory>,
  ) {}

  async create(createDto: CreateProductionStageHistoryDto): Promise<ProductionStageHistory> {
    const history = this.historyRepository.create(createDto);
    return await this.historyRepository.save(history);
  }

  async findAll(
    page = 1,
    limit = 10,
    stageId?: number,
    startDate?: Date,
    endDate?: Date,
    stopReason?: StopReason,
  ): Promise<{ data: ProductionStageHistory[]; total: number }> {
    const where: FindOptionsWhere<ProductionStageHistory> = {};

    if (stageId) {
      where.stageId = stageId;
    }

    if (startDate && endDate) {
      where.startTime = Between(startDate, endDate);
    } else if (startDate) {
      where.startTime = Between(startDate, new Date());
    }

    if (stopReason) {
      where.stopReason = stopReason;
    }

    const [data, total] = await this.historyRepository.findAndCount({
      where,
      relations: ['stage', 'product'],
      skip: (page - 1) * limit,
      take: limit,
      order: { startTime: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<ProductionStageHistory> {
    const history = await this.historyRepository.findOne({
      where: { id },
      relations: ['stage', 'product'],
    });

    if (!history) {
      throw new NotFoundException(`Production stage history with ID ${id} not found`);
    }

    return history;
  }

  async update(
    id: number,
    updateDto: UpdateProductionStageHistoryDto,
  ): Promise<ProductionStageHistory> {
    const history = await this.findOne(id);
    const updated = this.historyRepository.merge(history, updateDto);
    return await this.historyRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    const result = await this.historyRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Production stage history with ID ${id} not found`);
    }
  }

  async getStageHistoryByDateRange(
    stageId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ProductionStageHistory[]> {
    return await this.historyRepository.find({
      where: {
        stageId,
        startTime: Between(startDate, endDate),
      },
      order: { startTime: 'ASC' },
    });
  }

  async getLatestStageHistory(stageId: number): Promise<ProductionStageHistory | null> {
    return await this.historyRepository.findOne({
      where: { stageId },
      order: { startTime: 'DESC' },
    });
  }

   /**
   * Update the latest history record for a given stageId and productId (where endTime is null)
   * Used for API: PUT /production-stage-history/update-latest
   */
  async updateLatest(
    stageId: number,
    productId: number,
    updateDto: Partial<UpdateProductionStageHistoryDto>,
  ): Promise<ProductionStageHistory> {
    // Find the latest history record for this stageId and productId where endTime is null
    const latest = await this.historyRepository.findOne({
      where: {
        stageId,
        productId,
        endTime: IsNull(),
      },
      order: { startTime: 'DESC' },
    });
    if (!latest) {
      throw new NotFoundException('No running history record found for this stage and product');
    }
    // Merge update fields
    const updated = this.historyRepository.merge(latest, updateDto);
    return await this.historyRepository.save(updated);
  }
}