import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { Position } from '../../positions/entities/position.entity';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';
import { Workshop } from '../../workshops/entities/workshop.entity';

/**
 * Production Daily Summary Entity
 * 
 * Tổng hợp sản xuất theo NGÀY
 * 
 * Tổng hợp từ 2 ca trong ngày:
 * - Ca ngày (6h-18h)
 * - Ca đêm (18h-6h sáng hôm sau)
 * 
 * Auto-generated bởi scheduled job vào cuối mỗi ngày
 */
@Entity('production_daily_summaries')
@Index(['deviceId', 'summaryDate'], { unique: true }) // Unique per device per day
@Index(['summaryDate']) // Query by date
@Index(['productionLineId', 'summaryDate']) // Query by line
@Index(['workshopId', 'summaryDate']) // Query by workshop
@Index(['status']) // Query by status
export class ProductionDailySummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Date Information
  @Column({ type: 'date', comment: 'Ngày tổng hợp (YYYY-MM-DD)' })
  summaryDate: string;

  @Column({ type: 'int', comment: 'Năm' })
  year: number;

  @Column({ type: 'int', comment: 'Tháng (1-12)' })
  month: number;

  @Column({ type: 'int', comment: 'Ngày trong tháng (1-31)' })
  day: number;

  @Column({ type: 'int', comment: 'Ngày trong tuần (0=CN, 1=T2, ... 6=T7)' })
  dayOfWeek: number;

  @Column({ type: 'int', comment: 'Tuần trong năm (1-53)' })
  weekOfYear: number;

  // Device & Location
  @Column()
  deviceId: string;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'deviceId' })
  device?: Device;

  @Column({ nullable: true })
  positionId?: number;

  @ManyToOne(() => Position, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'positionId' })
  position?: Position;

  @Column({ nullable: true })
  productionLineId?: number;

  @ManyToOne(() => ProductionLine, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productionLineId' })
  productionLine?: ProductionLine;

  @Column({ nullable: true })
  workshopId?: number;

  @ManyToOne(() => Workshop, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workshopId' })
  workshop?: Workshop;

  // Shift Breakdown
  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Sản lượng ca ngày (6h-18h)' 
  })
  dayShiftCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Sản lượng ca đêm (18h-6h)' 
  })
  nightShiftCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Tổng sản lượng cả ngày' 
  })
  totalCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Số lỗi ca ngày' 
  })
  dayShiftErrCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Số lỗi ca đêm' 
  })
  nightShiftErrCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Tổng số lỗi cả ngày' 
  })
  totalErrCount: number;

  @Column({ 
    type: 'decimal', 
    precision: 5, 
    scale: 2, 
    default: 0,
    comment: 'Tỷ lệ lỗi tổng (%)' 
  })
  errorRate: number;

  // Quality Metrics
  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'RSSI trung bình trong ngày' 
  })
  avgRssi?: number;

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'Mức pin trung bình (%)' 
  })
  avgBattery?: number;

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'Nhiệt độ trung bình (°C)' 
  })
  avgTemperature?: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Tổng số message nhận trong ngày' 
  })
  messageCount: number;

  // Performance Metrics
  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    nullable: true,
    comment: 'Tốc độ sản xuất trung bình (sản phẩm/giờ)' 
  })
  avgProductionRate?: number;

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'Tổng thời gian downtime (phút)' 
  })
  downtimeMinutes?: number;

  @Column({ 
    type: 'decimal', 
    precision: 5, 
    scale: 2, 
    nullable: true,
    comment: 'Tỷ lệ hoạt động (%)' 
  })
  uptimePercentage?: number;

  // Target & Achievement
  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'Chỉ tiêu sản xuất ngày' 
  })
  targetCount?: number;

  @Column({ 
    type: 'decimal', 
    precision: 5, 
    scale: 2, 
    nullable: true,
    comment: 'Tỷ lệ hoàn thành (%)' 
  })
  achievementRate?: number;

  // Comparison with Previous Day
  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'So sánh với ngày hôm trước (delta)' 
  })
  deltaFromPreviousDay?: number;

  @Column({ 
    type: 'decimal', 
    precision: 5, 
    scale: 2, 
    nullable: true,
    comment: 'Tỷ lệ thay đổi so với ngày trước (%)' 
  })
  changeRateFromPreviousDay?: number;

  // Status
  @Column({ 
    type: 'enum', 
    enum: ['pending', 'partial', 'completed', 'verified'],
    default: 'pending',
    comment: 'Trạng thái: pending (chưa chốt), partial (đang chốt), completed (đã chốt), verified (đã xác nhận)' 
  })
  status: 'pending' | 'partial' | 'completed' | 'verified';

  @Column({ 
    type: 'timestamp', 
    nullable: true,
    comment: 'Thời điểm chốt ngày' 
  })
  closedAt?: Date;

  @Column({ 
    type: 'varchar', 
    nullable: true,
    comment: 'Người chốt số liệu' 
  })
  closedBy?: string;

  // Notes & Comments
  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'Ghi chú ngày làm việc' 
  })
  notes?: string;

  @Column({ 
    type: 'jsonb', 
    nullable: true,
    comment: 'Metadata bổ sung (JSON)' 
  })
  metadata?: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
