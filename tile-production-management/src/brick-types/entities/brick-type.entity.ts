import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Production } from '../../productions/entities/production.entity';
import { ProductionSummary } from '../../production-summaries/entities/production-summary.entity';
import { ProductionMetric } from '../../production-metrics/entities/production-metric.entity';
import { QuotaTarget } from '../../quota-targets/entities/quota-target.entity';

@Entity('brick_types')
export class BrickType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  unit?: string;

  @Column({ type: 'json', nullable: true })
  specs?: any;

  @OneToMany(() => Production, (prod) => prod.brickType)
  productions: Production[];

  @OneToMany(() => ProductionSummary, (sum) => sum.brickType)
  summaries: ProductionSummary[];

  @OneToMany(() => ProductionMetric, (metric) => metric.brickType)
  metrics: ProductionMetric[];

  @OneToMany(() => QuotaTarget, (quota) => quota.brickType)
  quotaTargets: QuotaTarget[];
}
