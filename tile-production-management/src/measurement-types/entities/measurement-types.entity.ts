import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    Index,
} from 'typeorm';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import { Measurement } from 'src/measurement/entities/measurement.entity';

@Entity('measurement_types')
export class MeasurementType {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 64 })
    code: string; // VD: COUNT_BRICK, TEMP_C, HUMIDITY

    @Column({ type: 'varchar', length: 255 })
    name: string; // Tên dễ đọc: "Đếm gạch", "Nhiệt độ (°C)", ...

    @Column({ type: 'jsonb', nullable: false })
    data_schema: Record<string, any>; // VD: { count: 'number' } | { humidity: 'number' }

    @Column({ type: 'int', default: 1 })
    data_schema_version: number;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @OneToMany(() => DeviceCluster, (cluster) => cluster.measurementType)
    clusters: DeviceCluster[];

    @OneToMany(() => Measurement, (m) => m.type)
    measurements: Measurement[];
}

