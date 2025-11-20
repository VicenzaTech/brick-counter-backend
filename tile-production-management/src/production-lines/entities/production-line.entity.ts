import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Workshop } from '../../workshops/entities/workshop.entity';
import { Position } from '../../positions/entities/position.entity';
import { ProductionSummary } from '../../production-summaries/entities/production-summary.entity';
import { ProductionMetric } from '../../production-metrics/entities/production-metric.entity';
import { BrickType } from '../../brick-types/entities/brick-type.entity';

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

  // Current brick type being produced on this line
  @Column({ nullable: true })
  activeBrickTypeId?: number;

  @ManyToOne(() => BrickType, { nullable: true })
  @JoinColumn({ name: 'activeBrickTypeId' })
  activeBrickType?: BrickType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  productionStatus?: 'producing' | 'paused' | 'stopped';

  @ManyToOne(() => Workshop, (workshop) => workshop.lines)
  workshop: Workshop;

  @OneToMany(() => Position, (pos) => pos.productionLine)
  positions: Position[];

  @OneToMany(() => ProductionSummary, (sum) => sum.productionLine)
  summaries: ProductionSummary[];

  @OneToMany(() => ProductionMetric, (metric) => metric.productionLine)
  metrics: ProductionMetric[];
}
