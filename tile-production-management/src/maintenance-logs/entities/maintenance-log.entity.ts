import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';

@Entity('maintenance_logs')
export class MaintenanceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', nullable: true })
  date?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  duration?: number;

  @ManyToOne(() => Device, (device) => device.maintenances)
  device?: Device;

  @ManyToOne(() => ProductionLine, (line) => line.maintenances)
  productionLine?: ProductionLine;
}
