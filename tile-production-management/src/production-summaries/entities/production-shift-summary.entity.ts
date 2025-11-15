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
 * Production Shift Summary Entity
 * 
 * Tổng hợp sản xuất theo CA LÀM VIỆC
 * 
 * Ca 1 (Day Shift):   06:00 - 18:00
 * Ca 2 (Night Shift): 18:00 - 06:00 (ngày hôm sau)
 * 
 * Auto-generated bởi scheduled job hoặc manual trigger
 */
@Entity('production_shift_summaries')
@Index(['deviceId', 'shiftDate', 'shiftType'], { unique: true }) // Unique per device per shift
@Index(['shiftDate', 'shiftType']) // Query by shift
@Index(['productionLineId', 'shiftDate']) // Query by line
@Index(['workshopId', 'shiftDate']) // Query by workshop
@Index(['status']) // Query by status
export class ProductionShiftSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Shift Information
  @Column({ type: 'date', comment: 'Ngày của ca (YYYY-MM-DD)' })
  shiftDate: string;

  @Column({ 
    type: 'enum', 
    enum: ['day', 'night'],
    comment: 'Loại ca: day (6h-18h), night (18h-6h)' 
  })
  shiftType: 'day' | 'night';

  @Column({ type: 'int', comment: 'Số thứ tự ca trong năm (1-730)' })
  shiftNumber: number;

  @Column({ type: 'timestamp', comment: 'Thời điểm bắt đầu ca' })
  shiftStartAt: Date;

  @Column({ type: 'timestamp', comment: 'Thời điểm kết thúc ca' })
  shiftEndAt: Date;

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

  // Production Metrics
  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Số lượng sản xuất đầu ca' 
  })
  startCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Số lượng sản xuất cuối ca' 
  })
  endCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Tổng sản lượng trong ca (endCount - startCount)' 
  })
  totalCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Số lỗi đầu ca' 
  })
  startErrCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Số lỗi cuối ca' 
  })
  endErrCount: number;

  @Column({ 
    type: 'int', 
    default: 0, 
    comment: 'Tổng số lỗi trong ca' 
  })
  totalErrCount: number;

  @Column({ 
    type: 'decimal', 
    precision: 5, 
    scale: 2, 
    default: 0,
    comment: 'Tỷ lệ lỗi (%)' 
  })
  errorRate: number; // (totalErrCount / totalCount) * 100

  // Quality Metrics
  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'RSSI trung bình trong ca' 
  })
  avgRssi?: number;

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'RSSI thấp nhất trong ca' 
  })
  minRssi?: number;

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'RSSI cao nhất trong ca' 
  })
  maxRssi?: number;

  // Device Health
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
    comment: 'Số message nhận được trong ca' 
  })
  messageCount: number;

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'Thời gian uptime trung bình (giây)' 
  })
  avgUptime?: number;

  // Performance Metrics
  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    nullable: true,
    comment: 'Tốc độ sản xuất trung bình (sản phẩm/giờ)' 
  })
  avgProductionRate?: number; // totalCount / (shift duration in hours)

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'Thời gian downtime trong ca (phút)' 
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
    comment: 'Chỉ tiêu sản xuất ca' 
  })
  targetCount?: number;

  @Column({ 
    type: 'decimal', 
    precision: 5, 
    scale: 2, 
    nullable: true,
    comment: 'Tỷ lệ hoàn thành (%)' 
  })
  achievementRate?: number; // (totalCount / targetCount) * 100

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
    comment: 'Thời điểm chốt ca' 
  })
  closedAt?: Date;

  @Column({ 
    type: 'varchar', 
    nullable: true,
    comment: 'Người chốt ca' 
  })
  closedBy?: string;

  // Notes & Comments
  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'Ghi chú ca làm việc' 
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
