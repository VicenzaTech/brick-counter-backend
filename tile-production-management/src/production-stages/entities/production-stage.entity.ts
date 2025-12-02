import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Position } from '../../positions/entities/position.entity';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';
import { ProductionStageHistory } from '../../production-stage-history/entities/production-stage-history.entity';
@Entity('production_stages')
export class ProductionStage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'enum', enum: ['pending', 'running', 'waiting_log'], nullable: false, default: 'pending' })
  status: string;

  @Column({ type: 'int', nullable: true })
  productId: number;

  // One-to-Many relationship with ProductionStageHistory
  @OneToMany(() => ProductionStageHistory, history => history.stage, { cascade: true })
  history: ProductionStageHistory[];

  // One-to-Many relationship with Position
  @OneToMany(() => Position, position => position.productionStage, { nullable: true })
  positions: Position[];

  // Many-to-One relationship with ProductionLine
  @ManyToOne(() => ProductionLine, productionLine => productionLine.productionStages)
  @JoinColumn({ name: 'productionLineId' })
  productionLine: ProductionLine;

  @Column()
  productionLineId: number;

  // Timestamps
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}