import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { Position } from '../../positions/entities/position.entity';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import { Measurement } from 'src/measurement/entities/measurement.entity';
import type { DeviceExtraInfo } from 'src/common/mqtt/device-extra-info';

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    deviceId: string;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    type?: string;

    @Column({ unique: true })
    serial_number: string;

    @Column({ type: 'date', nullable: true })
    installation_date?: string;

    @Column({ default: 'online' })
    status: string;

    @Column({ type: 'date', nullable: true })
    last_maintenance?: string;

    @Column({ type: 'jsonb', nullable: true })
    extraInfo: DeviceExtraInfo | null;

    @ManyToOne(() => Position, (pos) => pos.devices, { nullable: true })
    position: Position | null;

    @Column({ name: 'cluster_id', type: 'int', nullable: true })
    clusterId: number | null;

    @ManyToOne(() => DeviceCluster, (cluster) => cluster.devices, {
        onDelete: 'SET NULL',
        nullable: true,
    })
    @JoinColumn({ name: 'cluster_id' })
    cluster: DeviceCluster | null;

    @Column({ type: 'timestamptz', name: 'last_seen_at', nullable: true })
    lastSeenAt?: Date;

    @OneToMany(() => Measurement, (m) => m.device)
    measurements: Measurement[];
}
