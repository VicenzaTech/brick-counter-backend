import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';
import { Device } from '../../devices/entities/device.entity';

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  coordinates?: string;

  @ManyToOne(() => ProductionLine, (line) => line.positions)
  productionLine: ProductionLine;

  @OneToMany(() => Device, (device) => device.position)
  devices: Device[];
}
