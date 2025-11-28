import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Position } from '../../positions/entities/position.entity';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';

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

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

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