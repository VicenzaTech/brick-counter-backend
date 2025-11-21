import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Device } from 'src/devices/entities/device.entity';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import { MeasurementType } from 'src/measurement-types/entities/measurement-types.entity';

@Entity({ name: 'measurements' })
@Index(['timestamp'])
@Index(['device_id', 'timestamp'])
export class Measurement {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    // Partition key
    @PrimaryColumn({ type: 'timestamptz' })
    timestamp: Date;

    @Column({ type: 'int' })
    device_id: number;

    @Column({ type: 'int', nullable: true })
    cluster_id: number | null;

    @Column({ type: 'int', name: 'type_id' })
    type_id: number;

    @Column({ type: 'timestamptz', default: () => 'now()', name: 'ingest_time' })
    ingest_time: Date;

    @Column({ type: 'jsonb' })
    data: Record<string, any>;

    @ManyToOne(() => Device, (device) => device.measurements, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'device_id' })
    device: Device;

    @ManyToOne(() => DeviceCluster, (cluster) => cluster.measurements, {
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'cluster_id' })
    cluster: DeviceCluster;

    @ManyToOne(() => MeasurementType, (type) => type.measurements, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'type_id' })
    type: MeasurementType;
}
