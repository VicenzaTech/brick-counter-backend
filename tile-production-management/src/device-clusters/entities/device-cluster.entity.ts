import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Device } from 'src/devices/entities/device.entity';
import { MeasurementType } from 'src/measurement-types/entities/measurement-types.entity';
import { Measurement } from 'src/measurement/entities/measurement.entity';
import { ProductionLine } from 'src/production-lines/entities/production-line.entity';
import type { ClusterConfig } from 'src/common/mqtt/cluster-config';

@Entity('devices_cluster')
export class DeviceCluster {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 100, nullable: false })
    code: string; // vd: BRICK_COUNTER, TEMP_SENSOR, ...

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'jsonb', nullable: true })
    config?: ClusterConfig;

    @Column({ name: 'measurement_type_id', type: 'int' })
    measurementTypeId: number;

    @ManyToOne(
        () => MeasurementType,
        (measurementType) => measurementType.clusters,
        { onDelete: 'RESTRICT', eager: true },
    )
    @JoinColumn({ name: 'measurement_type_id' })
    measurementType: MeasurementType;

    @Column({ name: 'production_line_id', type: 'int', nullable: true })
    productionLineId: number | null;

    @ManyToOne(
        () => ProductionLine,
        (line) => line.deviceClusters,
        { onDelete: 'SET NULL', nullable: true },
    )
    @JoinColumn({ name: 'production_line_id' })
    productionLine: ProductionLine | null;

    @OneToMany(() => Device, (device) => device.cluster)
    devices: Device[];

    @OneToMany(() => Measurement, (m) => m.cluster)
    measurements: Measurement[];
}

