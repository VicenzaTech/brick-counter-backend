import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';
import { BrickType } from '../../brick-types/entities/brick-type.entity';

@Entity('production_summaries')
export class ProductionSummary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  period_type?: string;

  @Column({ type: 'date', nullable: true })
  period_start?: string;

  @Column({ type: 'date', nullable: true })
  period_end?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  total_quantity?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  efficiency?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  average_errors?: number;

  @ManyToOne(() => ProductionLine, (line) => line.summaries)
  productionLine: ProductionLine;

  @ManyToOne(() => BrickType, (brickType) => brickType.summaries)
  brickType: BrickType;
}
