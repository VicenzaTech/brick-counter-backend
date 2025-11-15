import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Position } from '../../positions/entities/position.entity';
import { Device } from './device.entity';

/**
 * Device Telemetry Log Entity
 * 
 * Lưu trữ TOÀN BỘ log telemetry từ MQTT broker
 * Mỗi message MQTT = 1 record
 * 
 * Use cases:
 * - Audit trail: Truy vết lịch sử thay đổi
 * - Data analysis: Phân tích xu hướng, pattern
 * - Debugging: Tìm lỗi, kiểm tra message
 * - Compliance: Đáp ứng yêu cầu lưu trữ dữ liệu
 */
@Entity('device_telemetry_logs')
@Index(['deviceId', 'recordedAt']) // Tìm kiếm theo device + thời gian
@Index(['deviceId', 'shiftDate', 'shiftType']) // Tìm kiếm theo ca làm việc
@Index(['positionId', 'recordedAt']) // Tìm kiếm theo vị trí
@Index(['recordedAt']) // Tìm kiếm theo thời gian
export class DeviceTelemetryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Device Information
  @Column()
  deviceId: string;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'deviceId' })
  device?: Device;

  @Column({ nullable: true })
  positionId?: number;

  @ManyToOne(() => Position, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'positionId' })
  position?: Position;

  // Telemetry Metrics
  @Column({ type: 'int', default: 0, comment: 'Số lượng sản phẩm' })
  count: number;

  @Column({ type: 'int', default: 0, comment: 'Số lượng lỗi' })
  errCount: number;

  @Column({ type: 'int', default: 0, comment: 'Cường độ tín hiệu (dBm)' })
  rssi: number;

  // Device Health Status
  @Column({ default: 'unknown', comment: 'Trạng thái: online, offline, warning, error' })
  status: string;

  @Column({ type: 'int', nullable: true, comment: 'Mức pin (%)' })
  battery?: number;

  @Column({ type: 'int', nullable: true, comment: 'Nhiệt độ (°C)' })
  temperature?: number;

  @Column({ type: 'bigint', nullable: true, comment: 'Thời gian hoạt động (giây)' })
  uptime?: number;

  // Shift & Date Classification
  // Tự động tính toán khi insert dựa vào recordedAt
  @Column({ type: 'date', comment: 'Ngày làm việc (YYYY-MM-DD)' })
  shiftDate: string; // Ngày của ca làm việc

  @Column({ 
    type: 'enum', 
    enum: ['day', 'night'], // day: 6h-18h, night: 18h-6h
    comment: 'Loại ca: day (6h-18h), night (18h-6h)' 
  })
  shiftType: 'day' | 'night';

  @Column({ type: 'int', comment: 'Số thứ tự ca trong năm (1-730)' })
  shiftNumber: number; // Ví dụ: Ca 1 của năm 2025 = 1

  // Timestamps
  @Column({ 
    type: 'timestamp', 
    comment: 'Thời điểm đo đạc từ thiết bị (từ MQTT message)' 
  })
  recordedAt: Date;

  @CreateDateColumn({ comment: 'Thời điểm nhận message từ broker' })
  receivedAt: Date;

  // Raw Data for debugging
  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    comment: 'Raw MQTT message payload (JSON)' 
  })
  rawPayload?: Record<string, any>;

  // Delta Calculation (so với message trước đó)
  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'Số lượng tăng thêm so với message trước' 
  })
  deltaCount?: number;

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'Số lỗi tăng thêm so với message trước' 
  })
  deltaErrCount?: number;

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'Thời gian giữa 2 message (giây)' 
  })
  timeSinceLast?: number;

  // Metadata
  @Column({ 
    type: 'varchar', 
    length: 50, 
    nullable: true, 
    comment: 'MQTT topic nhận message' 
  })
  mqttTopic?: string;

  @Column({ 
    type: 'int', 
    nullable: true, 
    comment: 'MQTT QoS level' 
  })
  mqttQos?: number;
}
