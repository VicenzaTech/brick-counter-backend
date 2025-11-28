import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import {
    ActivityEntityType,
    ActivityStatus,
    ActivitySeverity,
    ActivitySource,
} from './activity-log.enum'; // hoặc file hiện tại nếu để chung
import { User } from 'src/users/entities/user.entity';

@Entity('activity_logs')
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['actionType', 'createdAt'])
@Index(['source', 'createdAt'])
@Index(['createdAt'])
export class ActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    userId: string | null;

    @Column({ name: 'action', type: 'varchar', length: 80 })
    action: string;

    @Column({ name: 'action_type', type: 'varchar', length: 80 })
    actionType: string;

    @Column({
        name: 'entity_type',
        type: 'enum',
        enum: ActivityEntityType,
        nullable: true,
    })
    entityType: ActivityEntityType | null;

    @Column({ name: 'entity_id', type: 'int', nullable: true })
    entityId: number | null;

    @Column({
        name: 'entity_name',
        type: 'varchar',
        length: 200,
        nullable: true,
    })
    entityName: string | null;

    @Column({
        name: 'status',
        type: 'enum',
        enum: ActivityStatus,
    })
    status: ActivityStatus;

    @Column({
        name: 'severity',
        type: 'enum',
        enum: ActivitySeverity,
    })
    severity: ActivitySeverity;

    @Column({
        name: 'source',
        type: 'enum',
        enum: ActivitySource,
    })
    source: ActivitySource;

    @Column({
        name: 'metadata',
        type: 'jsonb',
        nullable: true,
    })
    metadata: Record<string, any> | null;

    @Column({ name: 'description', type: 'text', nullable: true })
    description: string | null;

    @Column({
        name: 'created_at',
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.activityLogs, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'user_id' })
    user?: User | null;
}
