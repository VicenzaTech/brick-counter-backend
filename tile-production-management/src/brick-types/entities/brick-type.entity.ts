import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductionSummary } from '../../production-summaries/entities/production-summary.entity';
import { ProductionMetric } from '../../production-metrics/entities/production-metric.entity';
import { QuotaTarget } from '../../quota-targets/entities/quota-target.entity';
import { ProductionStageHistory } from 'src/production-stage-history/entities/production-stage-history.entity';
import { ProductionLineRun } from 'src/production-line-runs/entities/production-line-run.entity';

@Entity('brick_types')
export class BrickType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: false })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  unit?: string;

  @Column({ type: 'json', nullable: true })
  specs?: any;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  activeProductionLineId?: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt?: Date;

  @Column({ type: 'text', nullable: true })
  activeStatus?: string; // 'producing', 'paused', 'inactive'

  // New fields from the factory production table
  @Column({ type: 'text', nullable: true })
  workshop?: string; // Phân xưởng

  @Column({ type: 'text', nullable: true })
  productionLine?: string; // Dây chuyền

  @Column({ type: 'text', nullable: true })
  tileSize?: string; // Kích thước SP

  @Column({ type: 'int', nullable: true })
  contractCycle?: number; // Chu kỳ khoán (phút)

  @Column({ type: 'int', nullable: true })
  kilnOutput?: number; // Sản lượng ra lò (m²)

  @Column({ type: 'int', nullable: true })
  qualityProductOutput?: number; // Sản lượng chính phẩm (m²)

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  deductionDays?: number; // Số ngày trừ khoán (ngày)

  @Column({ type: 'int', nullable: true })
  contractProduction?: number; // Sản lượng khoán (m²/tháng)

  @Column({ type: 'int', nullable: true })
  additionalContractWhenReducingCycle?: number; // Cộng khoán khi giảm chu kỳ (m²/tháng)

  @Column({ type: 'int', nullable: true })
  reducedContractWhenIncreasingCycle?: number; // Giảm khoán khi Tăng chu kỳ (m²/ngày)

  // CSV Standard Fields - Thong tin san pham
  @Column({ type: 'text', nullable: true })
  nameEnglish?: string; // Ten san pham (Tieng Anh)

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  thickness?: number; // Do day (mm)

  @Column({ type: 'text', nullable: true })
  brickType?: string; // Loai gach: Granite, Porcelain, Ceramic...

  // CSV Standard Fields - Thong tin dong goi & logistics
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  weightPerM2?: number; // Trong luong (kg/m2)

  @Column({ type: 'int', nullable: true })
  piecesPerBox?: number; // So luong vien/thung

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  m2PerBox?: number; // m2/thung

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  weightPerBox?: number; // Trong luong/thung (kg)

  @Column({ type: 'int', nullable: true })
  boxesPerPallet?: number; // So luong thung/pallet

  // CSV Standard Fields - Tieu chuan & phan loai
  @Column({ type: 'text', nullable: true })
  qualityStandard?: string; // Tieu chuan chat luong: BIa, BIb, TCVN 7132:2002, ISO 13006...

  @Column({ type: 'text', nullable: true })
  productLineName?: string; // Dong san pham

  @Column({ type: 'text', nullable: true })
  notes?: string; // Ghi chu

  @OneToMany(() => ProductionSummary, (sum) => sum.brickType)
  summaries: ProductionSummary[];

  @OneToMany(() => ProductionMetric, (metric) => metric.brickType)
  metrics: ProductionMetric[];

  @OneToMany(() => QuotaTarget, (quota) => quota.brickType)
  quotaTargets: QuotaTarget[];

  @OneToMany(() => ProductionStageHistory, history => history.product)
  history: ProductionStageHistory[];

  @OneToMany(() => ProductionLineRun, (run) => run.brickType)
  productionRuns: ProductionLineRun[];
}
