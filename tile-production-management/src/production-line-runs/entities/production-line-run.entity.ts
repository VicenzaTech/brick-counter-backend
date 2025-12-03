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
import { ProductionLine } from '../../production-lines/entities/production-line.entity';
import { BrickType } from '../../brick-types/entities/brick-type.entity';
import { ProductionStageHistory } from '../../production-stage-history/entities/production-stage-history.entity';

@Entity('production_line_runs')
export class ProductionLineRun {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: number;

    @Column({ name: 'production_line_id', type: 'int' })
    productionLineId: number;

    @ManyToOne(() => ProductionLine, (line) => line.productionRuns, { nullable: false })
    @JoinColumn({ name: 'production_line_id' })
    productionLine: ProductionLine;

    @Column({ name: 'brick_type_id', type: 'int', nullable: true })
    brickTypeId?: number;

    @ManyToOne(() => BrickType, (brickType) => brickType.productionRuns, { nullable: true })
    @JoinColumn({ name: 'brick_type_id' })
    brickType?: BrickType;

    @Column({ name: 'start_time', type: 'timestamptz', nullable: true })
    startTime?: Date;

    @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
    endTime?: Date;

    @Column({ name: 'duration_minutes', type: 'int', nullable: true })
    durationMinutes?: number;

    @Column({ name: 'total_pieces', type: 'numeric', precision: 12, scale: 2, default: 0 })
    totalPieces: number;

    @Column({ name: 'total_area_m2', type: 'numeric', precision: 12, scale: 2, default: 0 })
    totalAreaM2: number;

    @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
    status: string;

    @Column({ name: 'data_source', type: 'varchar', length: 16, default: 'auto' })
    dataSource: string;

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;

    @Column({ name: 'notes', type: 'text', nullable: true })
    notes?: string;

    @Column({ name: 'created_by', type: 'int', nullable: true })
    createdById?: number;

    @Column({ name: 'updated_by', type: 'int', nullable: true })
    updatedById?: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Index('uq_runs_press_stage', { unique: true, where: 'press_stage_history_id IS NOT NULL' })
    @Column({ name: 'press_stage_history_id', type: 'bigint', nullable: true })
    pressStageHistoryId?: number;

    @ManyToOne(() => ProductionStageHistory, { nullable: true })
    @JoinColumn({ name: 'press_stage_history_id' })
    pressStageHistory?: ProductionStageHistory;

    @Index('uq_runs_bisque_stage', { unique: true, where: 'bisque_stage_history_id IS NOT NULL' })
    @Column({ name: 'bisque_stage_history_id', type: 'bigint', nullable: true })
    bisqueStageHistoryId?: number;

    @ManyToOne(() => ProductionStageHistory, { nullable: true })
    @JoinColumn({ name: 'bisque_stage_history_id' })
    bisqueStageHistory?: ProductionStageHistory;

    @Index('uq_runs_glaze_stage', { unique: true, where: 'glaze_stage_history_id IS NOT NULL' })
    @Column({ name: 'glaze_stage_history_id', type: 'bigint', nullable: true })
    glazeStageHistoryId?: number;

    @ManyToOne(() => ProductionStageHistory, { nullable: true })
    @JoinColumn({ name: 'glaze_stage_history_id' })
    glazeStageHistory?: ProductionStageHistory;

    @Index('uq_runs_grind_stage', { unique: true, where: 'grind_stage_history_id IS NOT NULL' })
    @Column({ name: 'grind_stage_history_id', type: 'bigint', nullable: true })
    grindStageHistoryId?: number;

    @ManyToOne(() => ProductionStageHistory, { nullable: true })
    @JoinColumn({ name: 'grind_stage_history_id' })
    grindStageHistory?: ProductionStageHistory;

    @Index('uq_runs_packaging_stage', { unique: true, where: 'packaging_stage_history_id IS NOT NULL' })
    @Column({ name: 'packaging_stage_history_id', type: 'bigint', nullable: true })
    packagingStageHistoryId?: number;

    @ManyToOne(() => ProductionStageHistory, { nullable: true })
    @JoinColumn({ name: 'packaging_stage_history_id' })
    packagingStageHistory?: ProductionStageHistory;

    @Column({ name: 'press_quantity', type: 'numeric', precision: 12, scale: 2, default: 0 })
    pressQuantity: number;

    @Column({ name: 'press_area', type: 'numeric', precision: 12, scale: 2, default: 0 })
    pressArea: number;

    @Column({ name: 'bisque_quantity', type: 'numeric', precision: 12, scale: 2, default: 0 })
    bisqueQuantity: number;

    @Column({ name: 'bisque_area', type: 'numeric', precision: 12, scale: 2, default: 0 })
    bisqueArea: number;

    @Column({ name: 'glaze_quantity', type: 'numeric', precision: 12, scale: 2, default: 0 })
    glazeQuantity: number;

    @Column({ name: 'glaze_area', type: 'numeric', precision: 12, scale: 2, default: 0 })
    glazeArea: number;

    @Column({ name: 'grind_quantity', type: 'numeric', precision: 12, scale: 2, default: 0 })
    grindQuantity: number;

    @Column({ name: 'grind_area', type: 'numeric', precision: 12, scale: 2, default: 0 })
    grindArea: number;

    @Column({ name: 'packaging_quantity', type: 'numeric', precision: 12, scale: 2, default: 0 })
    packagingQuantity: number;

    @Column({ name: 'packaging_area', type: 'numeric', precision: 12, scale: 2, default: 0 })
    packagingArea: number;

    @Column({ name: 'a1_pieces', type: 'numeric', precision: 12, scale: 2, default: 0 })
    a1Pieces: number;

    @Column({ name: 'a2_pieces', type: 'numeric', precision: 12, scale: 2, default: 0 })
    a2Pieces: number;

    @Column({ name: 'cut_lo_pieces', type: 'numeric', precision: 12, scale: 2, default: 0 })
    cutLoPieces: number;

    @Column({ name: 'phe1_pieces', type: 'numeric', precision: 12, scale: 2, default: 0 })
    phe1Pieces: number;

    @Column({ name: 'phe2_pieces', type: 'numeric', precision: 12, scale: 2, default: 0 })
    phe2Pieces: number;

    @Column({ name: 'phe_huy_pieces', type: 'numeric', precision: 12, scale: 2, default: 0 })
    pheHuyPieces: number;
}
