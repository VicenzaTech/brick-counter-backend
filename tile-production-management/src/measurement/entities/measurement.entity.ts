import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'measurements' })
export class Measurement {
    @PrimaryColumn({ type: 'bigint' })
    id: string;

    @PrimaryColumn({ type: 'timestamptz' })
    timestamp: Date;

    @Column({ type: 'int' })
    device_id: number;

    @Column({ type: 'int' })
    cluster_id: number;

    @Column({ type: 'int' })
    type_id: number;

    @Column({ type: 'timestamptz', default: () => 'now()' })
    ingest_time: Date;

    @Column({ type: 'jsonb' })
    data: Record<string, any>;
}
