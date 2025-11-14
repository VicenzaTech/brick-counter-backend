import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductionLine } from './production-line.entity';
import { BrickType } from '../../brick-types/entities/brick-type.entity';

/**
 * Tracks which brick type is currently assigned to which production line
 * Allows multiple production lines to run the same brick type simultaneously
 * But ensures each production line runs only one brick type at a time
 */
@Entity('production_line_assignments')
export class ProductionLineAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productionLineId: number;

  @ManyToOne(() => ProductionLine)
  @JoinColumn({ name: 'productionLineId' })
  productionLine: ProductionLine;

  @Column()
  brickTypeId: number;

  @ManyToOne(() => BrickType)
  @JoinColumn({ name: 'brickTypeId' })
  brickType: BrickType;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'producing',
  })
  status: 'producing' | 'paused' | 'stopped';

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  stoppedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
