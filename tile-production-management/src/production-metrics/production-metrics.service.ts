import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ProductionMetric } from './entities/production-metric.entity';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { BrickType } from '../brick-types/entities/brick-type.entity';
import {
  CreateProductionMetricDto,
  UpdateProductionMetricDto,
  MetricsAnalyticsDto,
  MetricsSummaryDto,
  SankeyDataDto,
} from './dtos/production-metric.dto';

@Injectable()
export class ProductionMetricsService {
  constructor(
    @InjectRepository(ProductionMetric)
    private metricsRepository: Repository<ProductionMetric>,
    @InjectRepository(ProductionLine)
    private productionLineRepository: Repository<ProductionLine>,
    @InjectRepository(BrickType)
    private brickTypeRepository: Repository<BrickType>,
  ) {}

  /**
   * Tính toán các chỉ số hao phí và hiệu suất
   */
  private calculateMetrics(data: CreateProductionMetricDto | UpdateProductionMetricDto): Partial<ProductionMetric> {
    const {
      sl_ep,
      sl_truoc_lo,
      sl_sau_lo,
      sl_truoc_mai,
      sl_truoc_dong_hop,
    } = data;

    // Prevent division by zero
    const slEp = sl_ep || 0;
    const slTruocLo = sl_truoc_lo || 0;
    const slSauLo = sl_sau_lo || 0;
    const slTruocMai = sl_truoc_mai || 0;
    const slTruocDongHop = sl_truoc_dong_hop || 0;

    // Hao phí calculations
    const hp_moc = slEp - slTruocLo;
    const ty_le_hp_moc = slEp > 0 ? (hp_moc / slEp) * 100 : 0;

    const hp_lo = slTruocLo - slSauLo;
    const ty_le_hp_lo = slEp > 0 ? (hp_lo / slEp) * 100 : 0;

    const hp_tm = slSauLo - slTruocMai;
    const ty_le_hp_tm = slEp > 0 ? (hp_tm / slEp) * 100 : 0;

    const hp_ht = slTruocMai - slTruocDongHop;
    const ty_le_hp_ht = slEp > 0 ? (hp_ht / slEp) * 100 : 0;

    const tong_hao_phi = hp_moc + hp_lo + hp_tm + hp_ht;
    const ty_le_tong_hao_phi = slEp > 0 ? (tong_hao_phi / slEp) * 100 : 0;

    // Hiệu suất calculations
    const hieu_suat_moc = slEp > 0 ? (slTruocLo / slEp) * 100 : 0;
    const hieu_suat_lo = slEp > 0 ? (slSauLo / slEp) * 100 : 0;
    const hieu_suat_truoc_mai = slEp > 0 ? (slTruocMai / slEp) * 100 : 0;
    const hieu_suat_thanh_pham = slEp > 0 ? (slTruocDongHop / slEp) * 100 : 0;

    // Cảnh báo (thresholds)
    const canh_bao_hp_moc = ty_le_hp_moc > 2;
    const canh_bao_hp_lo = ty_le_hp_lo > 3;
    const canh_bao_hp_tm = ty_le_hp_tm > 2;
    const canh_bao_hp_ht = ty_le_hp_ht > 2;

    // Công đoạn có vấn đề
    const cong_doan_van_de: string[] = [];
    if (canh_bao_hp_moc) cong_doan_van_de.push('Mộc');
    if (canh_bao_hp_lo) cong_doan_van_de.push('Lò');
    if (canh_bao_hp_tm) cong_doan_van_de.push('Trước mài');
    if (canh_bao_hp_ht) cong_doan_van_de.push('Hoàn thiện');

    return {
      hp_moc,
      ty_le_hp_moc,
      hp_lo,
      ty_le_hp_lo,
      hp_tm,
      ty_le_hp_tm,
      hp_ht,
      ty_le_hp_ht,
      tong_hao_phi,
      ty_le_tong_hao_phi,
      hieu_suat_moc,
      hieu_suat_lo,
      hieu_suat_truoc_mai,
      hieu_suat_thanh_pham,
      canh_bao_hp_moc,
      canh_bao_hp_lo,
      canh_bao_hp_tm,
      canh_bao_hp_ht,
      cong_doan_van_de,
    };
  }

  async create(createDto: CreateProductionMetricDto): Promise<ProductionMetric> {
    // Verify production line exists
    const productionLine = await this.productionLineRepository.findOne({
      where: { id: createDto.productionLineId },
    });

    if (!productionLine) {
      throw new NotFoundException(`Production line with ID ${createDto.productionLineId} not found`);
    }

    // Verify brick type if provided
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

    // Calculate metrics
    const calculatedMetrics = this.calculateMetrics(createDto);

    // Create entity
    const metric = this.metricsRepository.create({
      timestamp: createDto.timestamp,
      shift: createDto.shift,
      sl_ep: createDto.sl_ep,
      sl_truoc_lo: createDto.sl_truoc_lo,
      sl_sau_lo: createDto.sl_sau_lo,
      sl_truoc_mai: createDto.sl_truoc_mai,
      sl_sau_mai_canh: createDto.sl_sau_mai_canh,
      sl_truoc_dong_hop: createDto.sl_truoc_dong_hop,
      ...calculatedMetrics,
    });

    metric.productionLine = productionLine;
    if (brickType) {
      metric.brickType = brickType;
    }

    return this.metricsRepository.save(metric);
  }

  async findAll(query?: MetricsAnalyticsDto): Promise<ProductionMetric[]> {
    const whereConditions: any = {};

    if (query) {
      if (query.productionLineId) {
        whereConditions.productionLine = { id: query.productionLineId };
      }
      if (query.brickTypeId) {
        whereConditions.brickType = { id: query.brickTypeId };
      }
      if (query.shift) {
        whereConditions.shift = query.shift;
      }
      if (query.startDate && query.endDate) {
        whereConditions.timestamp = Between(query.startDate, query.endDate);
      }
    }

    return this.metricsRepository.find({
      where: whereConditions,
      relations: ['productionLine', 'brickType'],
      order: { timestamp: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ProductionMetric> {
    const metric = await this.metricsRepository.findOne({
      where: { id },
      relations: ['productionLine', 'brickType'],
    });

    if (!metric) {
      throw new NotFoundException(`Production metric with ID ${id} not found`);
    }

    return metric;
  }

  async update(id: number, updateDto: UpdateProductionMetricDto): Promise<ProductionMetric> {
    const metric = await this.findOne(id);

    // Recalculate metrics with updated data
    const calculatedMetrics = this.calculateMetrics({ ...metric, ...updateDto });

    Object.assign(metric, updateDto, calculatedMetrics);

    return this.metricsRepository.save(metric);
  }

  async remove(id: number): Promise<void> {
    const metric = await this.findOne(id);
    await this.metricsRepository.remove(metric);
  }

  /**
   * Get metrics summary for analytics dashboard
   */
  async getMetricsSummary(query: MetricsAnalyticsDto): Promise<MetricsSummaryDto> {
    const metrics = await this.findAll(query);

    if (metrics.length === 0) {
      // Return default empty summary instead of throwing error
      return {
        ty_le_hao_phi_tong: 0,
        hieu_suat_san_xuat: 0,
        ty_le_dat_khoan: 0,
        san_luong_thuc_te: 0,
        san_luong_khoan: 0,
        hao_phi_moc: { value: 0, percentage: 0, status: 'good' },
        hao_phi_lo: { value: 0, percentage: 0, status: 'good' },
        hao_phi_truoc_mai: { value: 0, percentage: 0, status: 'good' },
        hao_phi_hoan_thien: { value: 0, percentage: 0, status: 'good' },
        trend_data: [],
        alerts: [],
        shift_comparison: [],
      };
    }

    // Calculate averages
    const avgHpMoc = metrics.reduce((sum, m) => sum + Number(m.ty_le_hp_moc), 0) / metrics.length;
    const avgHpLo = metrics.reduce((sum, m) => sum + Number(m.ty_le_hp_lo), 0) / metrics.length;
    const avgHpTm = metrics.reduce((sum, m) => sum + Number(m.ty_le_hp_tm), 0) / metrics.length;
    const avgHpHt = metrics.reduce((sum, m) => sum + Number(m.ty_le_hp_ht), 0) / metrics.length;
    const avgTotalWaste = metrics.reduce((sum, m) => sum + Number(m.ty_le_tong_hao_phi), 0) / metrics.length;
    const avgEfficiency = metrics.reduce((sum, m) => sum + Number(m.hieu_suat_thanh_pham), 0) / metrics.length;
    
    const totalOutput = metrics.reduce((sum, m) => sum + Number(m.sl_truoc_dong_hop), 0);

    // Determine status helper
    const getStatus = (value: number, threshold: number): 'good' | 'warning' | 'danger' => {
      if (value <= threshold * 0.8) return 'good';
      if (value <= threshold) return 'warning';
      return 'danger';
    };

    // Collect alerts
    const alerts: string[] = [];
    if (avgHpMoc > 2) alerts.push('Hao phí mộc vượt ngưỡng');
    if (avgHpLo > 3) alerts.push('Hao phí lò vượt ngưỡng');
    if (avgHpTm > 2) alerts.push('Hao phí trước mài vượt ngưỡng');
    if (avgHpHt > 2) alerts.push('Hao phí hoàn thiện vượt ngưỡng');

    // Trend data
    const trendData = metrics.slice(0, 20).map(m => ({
      timestamp: m.timestamp,
      ty_le_hao_phi: Number(m.ty_le_tong_hao_phi),
      hieu_suat: Number(m.hieu_suat_thanh_pham),
    }));

    // Shift comparison
    const shiftGroups = metrics.reduce((acc, m) => {
      const shift = m.shift || 'Unknown';
      if (!acc[shift]) {
        acc[shift] = [];
      }
      acc[shift].push(m);
      return acc;
    }, {} as Record<string, ProductionMetric[]>);

    const shiftComparison = Object.entries(shiftGroups).map(([shift, data]) => ({
      shift,
      san_luong: data.reduce((sum, m) => sum + Number(m.sl_truoc_dong_hop), 0),
      hieu_suat: data.reduce((sum, m) => sum + Number(m.hieu_suat_thanh_pham), 0) / data.length,
      ty_le_hao_phi: data.reduce((sum, m) => sum + Number(m.ty_le_tong_hao_phi), 0) / data.length,
    }));

    return {
      ty_le_hao_phi_tong: avgTotalWaste,
      hieu_suat_san_xuat: avgEfficiency,
      ty_le_dat_khoan: 0, // To be calculated with quota comparison
      san_luong_thuc_te: totalOutput,
      san_luong_khoan: 0, // To be fetched from quota targets
      hao_phi_moc: {
        value: avgHpMoc,
        percentage: avgHpMoc,
        status: getStatus(avgHpMoc, 2),
      },
      hao_phi_lo: {
        value: avgHpLo,
        percentage: avgHpLo,
        status: getStatus(avgHpLo, 3),
      },
      hao_phi_truoc_mai: {
        value: avgHpTm,
        percentage: avgHpTm,
        status: getStatus(avgHpTm, 2),
      },
      hao_phi_hoan_thien: {
        value: avgHpHt,
        percentage: avgHpHt,
        status: getStatus(avgHpHt, 2),
      },
      trend_data: trendData,
      alerts,
      shift_comparison: shiftComparison,
    };
  }

  /**
   * Generate Sankey diagram data for production flow
   */
  async getSankeyData(query: MetricsAnalyticsDto): Promise<SankeyDataDto> {
    const metrics = await this.findAll(query);

    if (metrics.length === 0) {
      throw new NotFoundException('No metrics found for the given criteria');
    }

    // Calculate totals
    const totals = metrics.reduce(
      (acc, m) => ({
        sl_ep: acc.sl_ep + Number(m.sl_ep),
        sl_truoc_lo: acc.sl_truoc_lo + Number(m.sl_truoc_lo),
        sl_sau_lo: acc.sl_sau_lo + Number(m.sl_sau_lo),
        sl_truoc_mai: acc.sl_truoc_mai + Number(m.sl_truoc_mai),
        sl_truoc_dong_hop: acc.sl_truoc_dong_hop + Number(m.sl_truoc_dong_hop),
        hp_moc: acc.hp_moc + Number(m.hp_moc),
        hp_lo: acc.hp_lo + Number(m.hp_lo),
        hp_tm: acc.hp_tm + Number(m.hp_tm),
        hp_ht: acc.hp_ht + Number(m.hp_ht),
      }),
      {
        sl_ep: 0,
        sl_truoc_lo: 0,
        sl_sau_lo: 0,
        sl_truoc_mai: 0,
        sl_truoc_dong_hop: 0,
        hp_moc: 0,
        hp_lo: 0,
        hp_tm: 0,
        hp_ht: 0,
      },
    );

    const nodes = [
      { name: 'Máy ép' },           // 0
      { name: 'Trước lò' },         // 1
      { name: 'Sau lò' },           // 2
      { name: 'Trước mài' },        // 3
      { name: 'Đóng hộp' },         // 4
      { name: 'HP Mộc' },           // 5
      { name: 'HP Lò' },            // 6
      { name: 'HP Trước mài' },     // 7
      { name: 'HP Hoàn thiện' },    // 8
    ];

    const links = [
      { source: 0, target: 1, value: totals.sl_truoc_lo },     // Máy ép -> Trước lò
      { source: 0, target: 5, value: totals.hp_moc },          // Máy ép -> HP Mộc
      { source: 1, target: 2, value: totals.sl_sau_lo },       // Trước lò -> Sau lò
      { source: 1, target: 6, value: totals.hp_lo },           // Trước lò -> HP Lò
      { source: 2, target: 3, value: totals.sl_truoc_mai },    // Sau lò -> Trước mài
      { source: 2, target: 7, value: totals.hp_tm },           // Sau lò -> HP Trước mài
      { source: 3, target: 4, value: totals.sl_truoc_dong_hop }, // Trước mài -> Đóng hộp
      { source: 3, target: 8, value: totals.hp_ht },           // Trước mài -> HP Hoàn thiện
    ];

    return { nodes, links };
  }

  /**
   * Get daily breakdown for date range
   */
  async getDailyBreakdown(query: MetricsAnalyticsDto): Promise<MetricsSummaryDto[]> {
    if (!query.startDate || !query.endDate) {
      return [];
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const dailyData: MetricsSummaryDto[] = [];

    // Loop through each day in the range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Query for this specific day
      const dayQuery: MetricsAnalyticsDto = {
        ...query,
        startDate: dayStart,
        endDate: dayEnd,
      };

      const summary = await this.getMetricsSummary(dayQuery);
      dailyData.push(summary);

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyData;
  }
}