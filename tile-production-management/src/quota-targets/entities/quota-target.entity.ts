import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BrickType } from '../../brick-types/entities/brick-type.entity';

@Entity('quota_targets')
export class QuotaTarget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Tên mức khoán

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthly_target: number; // Sản lượng khoán tháng (m²)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  daily_target: number; // Sản lượng khoán ngày (m²)

  @Column({ nullable: true })
  product_size: string; // 300x600mm, 400x800mm, etc.

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2 })
  threshold_hp_moc: number; // Ngưỡng hao phí mộc (%)

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3 })
  threshold_hp_lo: number; // Ngưỡng hao phí lò (%)

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2 })
  threshold_hp_tm: number; // Ngưỡng hao phí trước mài (%)

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2 })
  threshold_hp_ht: number; // Ngưỡng hao phí hoàn thiện (%)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  target_efficiency: number; // Hiệu suất mục tiêu (%)

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => BrickType, (type) => type.quotaTargets, { nullable: true })
  brickType: BrickType;
}
