import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Workshop } from '../../workshops/entities/workshop.entity';
import { Position } from '../../positions/entities/position.entity';
import { ProductionSummary } from '../../production-summaries/entities/production-summary.entity';
import { MaintenanceLog } from '../../maintenance-logs/entities/maintenance-log.entity';
import { ProductionMetric } from '../../production-metrics/entities/production-metric.entity';

@Entity('production_lines')
export class ProductionLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  capacity?: number;

  @Column({ default: 'active' })
  status: string;

  @ManyToOne(() => Workshop, (workshop) => workshop.lines)
  workshop: Workshop;

  @OneToMany(() => Position, (pos) => pos.productionLine)
  positions: Position[];

  @OneToMany(() => ProductionSummary, (sum) => sum.productionLine)
  summaries: ProductionSummary[];

  @OneToMany(() => MaintenanceLog, (log) => log.productionLine)
  maintenances: MaintenanceLog[];

  @OneToMany(() => ProductionMetric, (metric) => metric.productionLine)
  metrics: ProductionMetric[];
}
