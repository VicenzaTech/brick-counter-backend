import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { QuotaTarget } from './entities/quota-target.entity';
import { BrickType } from '../brick-types/entities/brick-type.entity';
import { ProductionMetric } from '../production-metrics/entities/production-metric.entity';
import {
  CreateQuotaTargetDto,
  UpdateQuotaTargetDto,
  QuotaComparisonDto,
  QuotaComparisonResultDto,
} from './dtos/quota-target.dto';

@Injectable()
export class QuotaTargetsService {
  constructor(
    @InjectRepository(QuotaTarget)
    private quotaRepository: Repository<QuotaTarget>,
    @InjectRepository(BrickType)
    private brickTypeRepository: Repository<BrickType>,
    @InjectRepository(ProductionMetric)
    private metricsRepository: Repository<ProductionMetric>,
  ) {}

  async create(createDto: CreateQuotaTargetDto): Promise<QuotaTarget> {
    let brickType: BrickType | undefined = undefined;
    if (createDto.brickTypeId) {
      const foundBrickType = await this.brickTypeRepository.findOne({
        where: { id: createDto.brickTypeId },
      });
      if (!foundBrickType) {
        throw new NotFoundException(`Brick type with ID ${createDto.brickTypeId} not found`);
      }
      brickType = foundBrickType;
    }

    const quota = this.quotaRepository.create({
      name: createDto.name,
      monthly_target: createDto.monthly_target,
      daily_target: createDto.daily_target,
      product_size: createDto.product_size,
      threshold_hp_moc: createDto.threshold_hp_moc || 2,
      threshold_hp_lo: createDto.threshold_hp_lo || 3,
      threshold_hp_tm: createDto.threshold_hp_tm || 2,
      threshold_hp_ht: createDto.threshold_hp_ht || 2,
      target_efficiency: createDto.target_efficiency,
      description: createDto.description,
    });

    if (brickType) {
      quota.brickType = brickType;
    }

    return this.quotaRepository.save(quota);
  }

  async findAll(): Promise<QuotaTarget[]> {
    return this.quotaRepository.find({
      relations: ['brickType'],
      order: { created_at: 'DESC' },
    });
  }

  async findActive(): Promise<QuotaTarget[]> {
    return this.quotaRepository.find({
      where: { is_active: true },
      relations: ['brickType'],
    });
  }

  async findOne(id: number): Promise<QuotaTarget> {
    const quota = await this.quotaRepository.findOne({
      where: { id },
      relations: ['brickType'],
    });

    if (!quota) {
      throw new NotFoundException(`Quota target with ID ${id} not found`);
    }

    return quota;
  }

  async findByBrickType(brickTypeId: number): Promise<QuotaTarget[]> {
    return this.quotaRepository.find({
      where: { brickType: { id: brickTypeId }, is_active: true },
      relations: ['brickType'],
    });
  }

  async update(id: number, updateDto: UpdateQuotaTargetDto): Promise<QuotaTarget> {
    const quota = await this.findOne(id);

    if (updateDto.brickTypeId) {
      const brickType = await this.brickTypeRepository.findOne({
        where: { id: updateDto.brickTypeId },
      });
      if (!brickType) {
        throw new NotFoundException(`Brick type with ID ${updateDto.brickTypeId} not found`);
      }
      quota.brickType = brickType;
    }

    Object.assign(quota, updateDto);
    return this.quotaRepository.save(quota);
  }

  async remove(id: number): Promise<void> {
    const quota = await this.findOne(id);
    await this.quotaRepository.remove(quota);
  }

  /**
   * Compare actual production against quota targets
   */
  async compareWithQuota(comparisonDto: QuotaComparisonDto): Promise<QuotaComparisonResultDto> {
    // Find applicable quota target
    let quota: QuotaTarget;
    
    if (comparisonDto.brickTypeId) {
      const quotas = await this.findByBrickType(comparisonDto.brickTypeId);
      if (quotas.length === 0) {
        throw new NotFoundException('No active quota target found for the specified brick type');
      }
      quota = quotas[0];
    } else {
      const quotas = await this.findActive();
      if (quotas.length === 0) {
        throw new NotFoundException('No active quota targets found');
      }
      quota = quotas[0];
    }

    // Get actual production metrics
    const whereConditions: any = {
      timestamp: Between(comparisonDto.startDate, comparisonDto.endDate),
      productionLine: { id: comparisonDto.productionLineId },
    };

    if (comparisonDto.brickTypeId) {
      whereConditions.brickType = { id: comparisonDto.brickTypeId };
    }

    const metrics = await this.metricsRepository.find({
      where: whereConditions,
    });

    if (metrics.length === 0) {
      throw new NotFoundException('No production metrics found for the specified period');
    }

    // Calculate total actual output
    const san_luong_thuc_te = metrics.reduce(
      (sum, m) => sum + Number(m.sl_truoc_dong_hop),
      0,
    );

    // Calculate period in days
    const startDate = new Date(comparisonDto.startDate);
    const endDate = new Date(comparisonDto.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Determine quota for the period
    const san_luong_khoan = quota.daily_target 
      ? Number(quota.daily_target) * daysDiff 
      : Number(quota.monthly_target);

    // Calculate comparison metrics
    const chenh_lech = san_luong_thuc_te - san_luong_khoan;
    const ty_le_vuot_khoan = san_luong_khoan > 0 
      ? (chenh_lech / san_luong_khoan) * 100 
      : 0;

    let performance_status: 'below' | 'meeting' | 'exceeding';
    if (ty_le_vuot_khoan < -5) {
      performance_status = 'below';
    } else if (ty_le_vuot_khoan > 5) {
      performance_status = 'exceeding';
    } else {
      performance_status = 'meeting';
    }

    return {
      san_luong_khoan,
      san_luong_thuc_te,
      chenh_lech,
      ty_le_vuot_khoan,
      quota_target: quota,
      performance_status,
    };
  }
}
