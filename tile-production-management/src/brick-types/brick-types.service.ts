import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BrickType } from './entities/brick-type.entity';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { ProductionMetric } from '../production-metrics/entities/production-metric.entity';
import { ProductionStageHistory } from '../production-stage-history/entities/production-stage-history.entity';
import { ProductionLineRun } from '../production-line-runs/entities/production-line-run.entity';
import { CreateBrickTypeDto } from './dtos/create-brick-type.dto';
import { UpdateBrickTypeDto } from './dtos/update-brick-type.dto';
import {
  GetStatisticsDto,
  GetTrendDto,
  CompareBrickTypesDto,
} from './dtos/statistics.dto';
import { LoggedResponse } from 'src/common/type/log.response';
import {
  ActivityAction,
  ActivityEntityType,
} from 'src/activity-log/entities/activity-log.enum';

@Injectable()
export class BrickTypesService {
  constructor(
    @InjectRepository(BrickType)
    private brickTypeRepository: Repository<BrickType>,
    @InjectRepository(ProductionLine)
    private productionLineRepository: Repository<ProductionLine>,
    @InjectRepository(ProductionMetric)
    private productionMetricRepository: Repository<ProductionMetric>,
    @InjectRepository(ProductionStageHistory)
    private productionStageHistoryRepository: Repository<ProductionStageHistory>,
    @InjectRepository(ProductionLineRun)
    private productionLineRunRepository: Repository<ProductionLineRun>,
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
  ): Promise<LoggedResponse<BrickType>> {
    const brickType = await this.findOne(id);
    const before = { ...brickType };

    Object.assign(brickType, updateBrickTypeDto);
    const updated = await this.brickTypeRepository.save(brickType);

    return {
      data: updated,
      log: {
        action: 'UPDATE_BRICK_TYPE' as ActivityAction,
        actionType: 'UPDATE_BRICK_TYPE' as ActivityAction,
        entityType: ActivityEntityType.BrickType,
        description: `Cập nhật loại gạch ${updated.name}`,
        entityId: updated.id,
        entityName: updated.name,
        meta: {
          before,
          after: updated,
        },
      },
    };
  }

  async remove(id: number): Promise<void> {
    const brickType = await this.findOne(id);
    await this.brickTypeRepository.remove(brickType);
  }

  /**
   * Set brick type as active on a production line
   * Note: A brick type can be active on multiple production lines simultaneously
   * Each production line can only run one brick type at a time
   */
  async setActive(
    id: number,
    productionLineId: number,
    status: 'producing' | 'paused' = 'producing',
  ): Promise<BrickType> {
    const brickType = await this.findOne(id);

    // Find the production line
    const productionLine = await this.productionLineRepository.findOne({
      where: { id: productionLineId },
    });

    if (!productionLine) {
      throw new NotFoundException(
        `Production line with ID ${productionLineId} not found`,
      );
    }

    // Check if the production line is already running a DIFFERENT brick type
    // Phải dừng sản xuất (activeBrickTypeId = null) trước khi chọn brick type khác
    if (
      productionLine.activeBrickTypeId &&
      productionLine.activeBrickTypeId !== id
    ) {
      const existingBrick = await this.brickTypeRepository.findOne({
        where: { id: productionLine.activeBrickTypeId },
      });

      const statusText =
        productionLine.productionStatus === 'producing'
          ? 'đang sản xuất'
          : 'đang tạm dừng';

      throw new ConflictException(
        `Dây chuyền này ${statusText} dòng gạch "${existingBrick?.name || productionLine.activeBrickTypeId}". ` +
          `Vui lòng dừng sản xuất dòng gạch hiện tại trước khi chọn dòng khác.`,
      );
    }

    // Update the production line with the new brick type
    productionLine.activeBrickTypeId = id;
    productionLine.productionStatus = status;
    await this.productionLineRepository.save(productionLine);

    // Also update the brick type for backward compatibility
    brickType.isActive = true;
    brickType.activeProductionLineId = productionLineId;
    brickType.activeStatus = status;
    brickType.lastActiveAt = new Date();
    return await this.brickTypeRepository.save(brickType);
  }

  /**
   * Set brick type as inactive on a specific production line
   * If productionLineId is provided, only stop that line
   * Otherwise, stop all lines running this brick type
   */
  async setInactive(id: number, productionLineId?: number): Promise<BrickType> {
    const brickType = await this.findOne(id);

    if (productionLineId) {
      // Stop specific production line
      const productionLine = await this.productionLineRepository.findOne({
        where: { id: productionLineId },
      });

      console.log(
        `🛑 Deactivating brick type ${id} on line ${productionLineId}`,
      );
      console.log(`   Line found: ${!!productionLine}`);
      console.log(
        `   Current activeBrickTypeId: ${productionLine?.activeBrickTypeId}`,
      );

      if (productionLine && productionLine.activeBrickTypeId === id) {
        productionLine.activeBrickTypeId = null as any; // Set null để dừng sản xuất (TypeORM sẽ lưu NULL vào DB)
        productionLine.productionStatus = 'stopped';

        const saved = await this.productionLineRepository.save(productionLine);
        console.log(
          `   ✅ Saved - activeBrickTypeId now: ${saved.activeBrickTypeId}`,
        );
      } else if (productionLine) {
        console.log(
          `   ⚠️ Skip - Line is running different brick type: ${productionLine.activeBrickTypeId}`,
        );
      }
    } else {
      // Stop all production lines running this brick type
      const lines = await this.productionLineRepository.find({
        where: { activeBrickTypeId: id },
      });

      for (const line of lines) {
        line.activeBrickTypeId = null as any; // Set null để dừng sản xuất (TypeORM sẽ lưu NULL vào DB)
        line.productionStatus = 'stopped';
        await this.productionLineRepository.save(line);
      }
    }

    // Update brick type status
    brickType.isActive = false;
    brickType.activeStatus = 'inactive';
    return await this.brickTypeRepository.save(brickType);
  }

  /**
   * Get all active brick types
   */
  async findAllActive(): Promise<BrickType[]> {
    return await this.brickTypeRepository.find({
      where: { isActive: true },
    });
  }

  /**
   * Get active brick types by production line
   */
  async findByProductionLine(productionLineId: number): Promise<BrickType[]> {
    return await this.brickTypeRepository.find({
      where: {
        isActive: true,
        activeProductionLineId: productionLineId,
      },
    });
  }

  /**
   * Get statistics for a brick type
   */
  async getStatistics(id: number, dto: GetStatisticsDto): Promise<any> {
    const brickType = await this.findOne(id);

    // Default date range: start of month to today
    const now = new Date();
    const startDate =
      dto.startDate ||
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const endDate = dto.endDate || now.toISOString().split('T')[0];

    // Get production metrics
    const metrics = await this.productionMetricRepository.find({
      where: {
        brickType: { id },
        recordDate: Between(startDate, endDate),
      },
      relations: ['productionLine'],
    });

    // Calculate totals
    const totalProduction = metrics.reduce(
      (sum, m) => sum + Number(m.sl_truoc_dong_hop || 0),
      0,
    );
    const averageEfficiency =
      metrics.length > 0
        ? metrics.reduce(
            (sum, m) => sum + Number(m.hieu_suat_thanh_pham || 0),
            0,
          ) / metrics.length
        : 0;
    const averageWaste =
      metrics.length > 0
        ? metrics.reduce(
            (sum, m) => sum + Number(m.ty_le_tong_hao_phi || 0),
            0,
          ) / metrics.length
        : 0;

    // Get current month production
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const monthEnd = now.toISOString().split('T')[0];
    const monthlyMetrics = await this.productionMetricRepository.find({
      where: {
        brickType: { id },
        recordDate: Between(monthStart, monthEnd),
      },
    });
    const monthlyProduction = monthlyMetrics.reduce(
      (sum, m) => sum + Number(m.sl_truoc_dong_hop || 0),
      0,
    );

    // Get production days (unique dates)
    const productionDays = new Set(metrics.map((m) => m.recordDate)).size;

    // Get production stage history for last produced date
    const lastHistory = await this.productionStageHistoryRepository.findOne({
      where: { productId: id },
      order: { startTime: 'DESC' },
    });

    // Get production lines that produced this brick type
    const productionLinesData = await this.productionMetricRepository
      .createQueryBuilder('metric')
      .select('metric.productionLineId', 'lineId')
      .addSelect('pl.name', 'lineName')
      .addSelect('COUNT(DISTINCT metric.recordDate)', 'daysProduced')
      .addSelect('SUM(metric.sl_truoc_dong_hop)', 'totalProduction')
      .addSelect('AVG(metric.hieu_suat_thanh_pham)', 'averageEfficiency')
      .addSelect('AVG(metric.ty_le_tong_hao_phi)', 'averageWaste')
      .addSelect('MAX(metric.recordDate)', 'lastProducedAt')
      .leftJoin('production_lines', 'pl', 'pl.id = metric.productionLineId')
      .where('metric.brickTypeId = :id', { id })
      .andWhere('metric.recordDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('metric.productionLineId')
      .addGroupBy('pl.name')
      .getRawMany();

    // Calculate waste breakdown
    const wasteBreakdown = {
      hp_moc: metrics.reduce((sum, m) => sum + Number(m.hp_moc || 0), 0),
      hp_lo: metrics.reduce((sum, m) => sum + Number(m.hp_lo || 0), 0),
      hp_tm: metrics.reduce((sum, m) => sum + Number(m.hp_tm || 0), 0),
      hp_ht: metrics.reduce((sum, m) => sum + Number(m.hp_ht || 0), 0),
      ty_le_hp_moc:
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + Number(m.ty_le_hp_moc || 0), 0) /
            metrics.length
          : 0,
      ty_le_hp_lo:
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + Number(m.ty_le_hp_lo || 0), 0) /
            metrics.length
          : 0,
      ty_le_hp_tm:
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + Number(m.ty_le_hp_tm || 0), 0) /
            metrics.length
          : 0,
      ty_le_hp_ht:
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + Number(m.ty_le_hp_ht || 0), 0) /
            metrics.length
          : 0,
    };

    return {
      totalProduction: Number(totalProduction.toFixed(2)),
      monthlyProduction: Number(monthlyProduction.toFixed(2)),
      productionDays,
      averageEfficiency: Number(averageEfficiency.toFixed(2)),
      averageWaste: Number(averageWaste.toFixed(2)),
      lastProducedAt: lastHistory?.startTime?.toISOString() || null,
      currentStatus: brickType.activeStatus || 'inactive',
      productionLines: productionLinesData.map((line) => ({
        lineId: Number(line.lineId),
        lineName: line.lineName || `Line ${line.lineId}`,
        daysProduced: Number(line.daysProduced),
        totalProduction: Number(Number(line.totalProduction || 0).toFixed(2)),
        averageEfficiency: Number(
          Number(line.averageEfficiency || 0).toFixed(2),
        ),
        averageWaste: Number(Number(line.averageWaste || 0).toFixed(2)),
        lastProducedAt: line.lastProducedAt,
      })),
      wasteBreakdown,
    };
  }

  /**
   * Get production trend for a brick type
   */
  async getTrend(id: number, dto: GetTrendDto): Promise<any> {
    await this.findOne(id); // Check if exists

    // Default date range: 30 days ago to today
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const startDate =
      dto.startDate || thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = dto.endDate || now.toISOString().split('T')[0];
    const groupBy = dto.groupBy || 'day';

    // Get production metrics
    const metrics = await this.productionMetricRepository.find({
      where: {
        brickType: { id },
        recordDate: Between(startDate, endDate),
      },
      order: { recordDate: 'ASC' },
    });

    if (groupBy === 'day') {
      // Group by day
      const dataMap = new Map<string, any>();

      metrics.forEach((metric) => {
        const date = metric.recordDate;
        if (!dataMap.has(date)) {
          dataMap.set(date, {
            date,
            production: 0,
            efficiency: [],
            waste: [],
            productionDays: 0,
          });
        }

        const data = dataMap.get(date);
        data.production += Number(metric.sl_truoc_dong_hop || 0);
        data.efficiency.push(Number(metric.hieu_suat_thanh_pham || 0));
        data.waste.push(Number(metric.ty_le_tong_hao_phi || 0));
        data.productionDays = 1;
      });

      return {
        data: Array.from(dataMap.values()).map((item) => ({
          date: item.date,
          production: Number(item.production.toFixed(2)),
          efficiency: Number(
            (
              item.efficiency.reduce((a, b) => a + b, 0) /
              item.efficiency.length
            ).toFixed(2),
          ),
          waste: Number(
            (item.waste.reduce((a, b) => a + b, 0) / item.waste.length).toFixed(
              2,
            ),
          ),
          productionDays: item.productionDays,
        })),
      };
    } else if (groupBy === 'week') {
      // Group by week
      const dataMap = new Map<string, any>();

      metrics.forEach((metric) => {
        const date = new Date(metric.recordDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!dataMap.has(weekKey)) {
          dataMap.set(weekKey, {
            date: weekKey,
            production: 0,
            efficiency: [],
            waste: [],
            productionDays: new Set(),
          });
        }

        const data = dataMap.get(weekKey);
        data.production += Number(metric.sl_truoc_dong_hop || 0);
        data.efficiency.push(Number(metric.hieu_suat_thanh_pham || 0));
        data.waste.push(Number(metric.ty_le_tong_hao_phi || 0));
        data.productionDays.add(metric.recordDate);
      });

      return {
        data: Array.from(dataMap.values()).map((item) => ({
          date: item.date,
          production: Number(item.production.toFixed(2)),
          efficiency: Number(
            (
              item.efficiency.reduce((a, b) => a + b, 0) /
              item.efficiency.length
            ).toFixed(2),
          ),
          waste: Number(
            (item.waste.reduce((a, b) => a + b, 0) / item.waste.length).toFixed(
              2,
            ),
          ),
          productionDays: item.productionDays.size,
        })),
      };
    } else {
      // Group by month
      const dataMap = new Map<string, any>();

      metrics.forEach((metric) => {
        const monthKey = metric.recordDate.substring(0, 7); // YYYY-MM

        if (!dataMap.has(monthKey)) {
          dataMap.set(monthKey, {
            date: monthKey,
            production: 0,
            efficiency: [],
            waste: [],
            productionDays: new Set(),
          });
        }

        const data = dataMap.get(monthKey);
        data.production += Number(metric.sl_truoc_dong_hop || 0);
        data.efficiency.push(Number(metric.hieu_suat_thanh_pham || 0));
        data.waste.push(Number(metric.ty_le_tong_hao_phi || 0));
        data.productionDays.add(metric.recordDate);
      });

      return {
        data: Array.from(dataMap.values()).map((item) => ({
          date: item.date,
          production: Number(item.production.toFixed(2)),
          efficiency: Number(
            (
              item.efficiency.reduce((a, b) => a + b, 0) /
              item.efficiency.length
            ).toFixed(2),
          ),
          waste: Number(
            (item.waste.reduce((a, b) => a + b, 0) / item.waste.length).toFixed(
              2,
            ),
          ),
          productionDays: item.productionDays.size,
        })),
      };
    }
  }

  /**
   * Compare multiple brick types
   */
  async compareBrickTypes(dto: CompareBrickTypesDto): Promise<any> {
    if (dto.brickTypeIds.length === 0) {
      throw new BadRequestException('brickTypeIds cannot be empty');
    }

    if (dto.brickTypeIds.length > 5) {
      throw new BadRequestException('Cannot compare more than 5 brick types');
    }

    // Check if all brick types exist
    const brickTypes = await this.brickTypeRepository.findByIds(
      dto.brickTypeIds,
    );
    if (brickTypes.length !== dto.brickTypeIds.length) {
      throw new NotFoundException('One or more brick types not found');
    }

    // Default date range: start of month to today
    const now = new Date();
    const startDate =
      dto.startDate ||
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const endDate = dto.endDate || now.toISOString().split('T')[0];

    const comparison = await Promise.all(
      brickTypes.map(async (brickType) => {
        // Get metrics for this brick type
        const metrics = await this.productionMetricRepository.find({
          where: {
            brickType: { id: brickType.id },
            recordDate: Between(startDate, endDate),
          },
        });

        const totalProduction = metrics.reduce(
          (sum, m) => sum + Number(m.sl_truoc_dong_hop || 0),
          0,
        );
        const averageEfficiency =
          metrics.length > 0
            ? metrics.reduce(
                (sum, m) => sum + Number(m.hieu_suat_thanh_pham || 0),
                0,
              ) / metrics.length
            : 0;
        const averageWaste =
          metrics.length > 0
            ? metrics.reduce(
                (sum, m) => sum + Number(m.ty_le_tong_hao_phi || 0),
                0,
              ) / metrics.length
            : 0;
        const productionDays = new Set(metrics.map((m) => m.recordDate)).size;

        // Get current month production
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        const monthEnd = now.toISOString().split('T')[0];
        const monthlyMetrics = await this.productionMetricRepository.find({
          where: {
            brickType: { id: brickType.id },
            recordDate: Between(monthStart, monthEnd),
          },
        });
        const monthlyProduction = monthlyMetrics.reduce(
          (sum, m) => sum + Number(m.sl_truoc_dong_hop || 0),
          0,
        );

        // Calculate completion rate (compare with contract production)
        const contractProduction = brickType.contractProduction || 0;
        const completionRate =
          contractProduction > 0
            ? (monthlyProduction / contractProduction) * 100
            : 0;

        return {
          brickTypeId: brickType.id,
          name: brickType.name,
          tileSize: brickType.tileSize || '',
          totalProduction: Number(totalProduction.toFixed(2)),
          averageEfficiency: Number(averageEfficiency.toFixed(2)),
          averageWaste: Number(averageWaste.toFixed(2)),
          productionDays,
          contractCycle: brickType.contractCycle || 0,
          kilnOutput: brickType.kilnOutput || 0,
          qualityProductOutput: brickType.qualityProductOutput || 0,
          contractProduction: brickType.contractProduction || 0,
          monthlyProduction: Number(monthlyProduction.toFixed(2)),
          completionRate: Number(completionRate.toFixed(2)),
        };
      }),
    );

    return { comparison };
  }
}
