import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Workshop } from 'src/workshops/entities/workshop.entity';

@Entity('workshop_targets')
@Index(['workshopId', 'year'], { unique: true })
export class WorkshopTarget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, name: 'yearly_target' })
  yearlyTarget: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'workshop_id', type: 'int' })
  workshopId: number;

  @ManyToOne(() => Workshop, (ws) => ws.targets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workshop_id' })
  workshop: Workshop;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
