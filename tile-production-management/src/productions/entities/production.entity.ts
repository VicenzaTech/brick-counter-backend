import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { BrickType } from '../../brick-types/entities/brick-type.entity';

@Entity('productions')
export class Production {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  shift?: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  quality_passed?: number;

  @Column({ nullable: true })
  errors?: number;

  @Column({ nullable: true })
  notes?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recorded_at: Date;

  @ManyToOne(() => Device, (device) => device.productions)
  device: Device;

  @ManyToOne(() => BrickType, (brickType) => brickType.productions)
  brickType: BrickType;
}
