import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';
import { BrickType } from '../../brick-types/entities/brick-type.entity';

@Entity('production_metrics')
export class ProductionMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ nullable: true })
  shift: string; // Ca A, B, C

  // Dữ liệu đầu vào từ cảm biến
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sl_ep: number; // Sau máy ép (SAU-ME-01 + SAU-ME-02)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sl_truoc_lo: number; // Trước lò nung (TRUOC-LN-01 + TRUOC-LN-02)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sl_sau_lo: number; // Sau lò nung (SAU-LN-01)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sl_truoc_mai: number; // Trước mài mặt (TRUOC-MM-01)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sl_sau_mai_canh: number; // Sau mài cạnh (SAU-MC-01)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sl_truoc_dong_hop: number; // Trước đóng hộp (TRUOC-DH-01)

  // Hao phí tính toán
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hp_moc: number; // = SL_Ep - SL_TruocLo

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  ty_le_hp_moc: number; // = (HP_Moc / SL_Ep) × 100%

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hp_lo: number; // = SL_TruocLo - SL_SauLo

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  ty_le_hp_lo: number; // = (HP_Lo / SL_Ep) × 100%

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hp_tm: number; // = SL_SauLo - SL_TruocMai

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  ty_le_hp_tm: number; // = (HP_TM / SL_Ep) × 100%

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hp_ht: number; // = SL_TruocMai - SL_TruocDongHop

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  ty_le_hp_ht: number; // = (HP_HT / SL_Ep) × 100%

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tong_hao_phi: number; // = HP_Moc + HP_Lo + HP_TM + HP_HT

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  ty_le_tong_hao_phi: number; // = (TongHaoPhi / SL_Ep) × 100%

  // Hiệu suất từng công đoạn
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hieu_suat_moc: number; // = (SL_TruocLo / SL_Ep) × 100%

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hieu_suat_lo: number; // = (SL_SauLo / SL_Ep) × 100%

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hieu_suat_truoc_mai: number; // = (SL_TruocMai / SL_Ep) × 100%

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hieu_suat_thanh_pham: number; // = (SL_TruocDongHop / SL_Ep) × 100%

  // Cảnh báo
  @Column({ type: 'boolean', default: false })
  canh_bao_hp_moc: boolean; // > 2%

  @Column({ type: 'boolean', default: false })
  canh_bao_hp_lo: boolean; // > 3%

  @Column({ type: 'boolean', default: false })
  canh_bao_hp_tm: boolean; // > 2%

  @Column({ type: 'boolean', default: false })
  canh_bao_hp_ht: boolean; // > 2%

  @Column({ type: 'simple-array', nullable: true })
  cong_doan_van_de: string[]; // ['Mộc', 'Lò', ...]

  @Column({ type: 'enum', enum: ['tang', 'giam', 'on-dinh'], nullable: true })
  xu_huong: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => ProductionLine, (line) => line.metrics)
  productionLine: ProductionLine;

  @ManyToOne(() => BrickType, (type) => type.metrics, { nullable: true })
  brickType: BrickType;
}
