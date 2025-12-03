import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ProductionStage } from '../../production-stages/entities/production-stage.entity';
import { BrickType } from '../../brick-types/entities/brick-type.entity';
import { ProductionLine } from 'src/production-lines/entities/production-line.entity';


export enum StopReason {
    MACHINE_ERROR = 'machine_error',
    CHANGE_PRODUCT = 'change_product',
    SHIFT_END = 'shift_end',
    MAINTENANCE = 'maintenance',
    OTHER = 'other',
    MANUAL_STOP = 'manual_stop',
    END = 'end',
}

@Entity('production_stage_history')
export class ProductionStageHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'stage_id' })
    stageId: number;

    @ManyToOne(() => ProductionStage, (stage: ProductionStage) => stage.history, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'stage_id' })
    stage: ProductionStage;

    @Column({ name: 'product_id', nullable: true })
    productId?: number;

    @ManyToOne(() => BrickType, { nullable: true })
    @JoinColumn({ name: 'product_id' })
    product?: BrickType;

    @Column({ name: 'start_time', type: 'timestamp' })
    startTime: Date;

    @Column({ name: 'end_time', type: 'timestamp', nullable: true })
    endTime?: Date;

    @Column({ nullable: true })
    quantity?: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    area?: number;

    @Column({
        name: 'stop_reason', // thêm dòng này
        type: 'enum',
        enum: StopReason,
        nullable: true
    })
    stopReason?: StopReason;

    @Column({ name: 'is_emergency', default: false })
    isEmergency: boolean;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ name: 'created_by_username', length: 100, nullable: true })
    createdByUsername?: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP'
    })
    updatedAt: Date;

    @Column({ name: 'production_line_id' })
    productionLineId: number;

    @ManyToOne(() => ProductionLine, (line: ProductionLine) => line.stageHistories, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'production_line_id' })
    productionLine: ProductionLine;

    // Helper method to calculate duration in minutes
    getDuration(): number | null {
        if (!this.endTime) return null;
        return (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60);
    }
}
