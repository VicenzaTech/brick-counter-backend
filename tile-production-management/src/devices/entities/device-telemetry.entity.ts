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

/**
 * Device Telemetry Entity
 * Lưu trữ dữ liệu telemetry gần nhất từ các thiết bị MQTT
 */
@Entity('device_telemetry')
@Index(['deviceId', 'positionId'])
export class DeviceTelemetry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deviceId: string;

  @Column({ nullable: true })
  positionId?: number;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'positionId' })
  position?: Position;

  // Metrics
  @Column({ type: 'int', default: 0 })
  count: number;

  @Column({ type: 'int', default: 0 })
  errCount: number;

  @Column({ type: 'int', default: 0 })
  rssi: number;

  // Status
  @Column({ default: 'unknown' })
  status: string;

  @Column({ type: 'int', nullable: true })
  battery?: number;

  @Column({ type: 'int', nullable: true })
  temperature?: number;

  @Column({ type: 'int', nullable: true })
  uptime?: number;

  // Timestamps
  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // Raw data (cho debug)
  @Column({ type: 'json', nullable: true })
  rawData?: any;
}
