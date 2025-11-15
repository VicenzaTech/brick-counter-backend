import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Position } from '../../positions/entities/position.entity';
import { Production } from '../../productions/entities/production.entity';
import { MaintenanceLog } from '../../maintenance-logs/entities/maintenance-log.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  deviceId: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  type?: string;

  @Column({ unique: true })
  serial_number: string;

  @Column({ type: 'date', nullable: true })
  installation_date?: string;

  @Column({ default: 'online' })
  status: string;

  @Column({ type: 'date', nullable: true })
  last_maintenance?: string;

  @ManyToOne(() => Position, (pos) => pos.devices)
  position: Position;

  @OneToMany(() => Production, (prod) => prod.device)
  productions: Production[];

  @OneToMany(() => MaintenanceLog, (log) => log.device)
  maintenances: MaintenanceLog[];
}
