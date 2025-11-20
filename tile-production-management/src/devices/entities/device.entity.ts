import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Position } from '../../positions/entities/position.entity';
import { Production } from '../../productions/entities/production.entity';
import { MaintenanceLog } from '../../maintenance-logs/entities/maintenance-log.entity';

export interface DeviceExtraInfo {
    qosDefault?: 0 | 1 | 2;
    interval_message_time?: number;
    sub_topic?: string; // topic to received telemetry 
    pub_topic?: {
        url: string,
        type: string | 'reset' | 'reset_counter'
    } // topic to send cmd to devices
}

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
    extraInfo: DeviceExtraInfo;

    @ManyToOne(() => Position, (pos) => pos.devices)
    position: Position;

    @OneToMany(() => Production, (prod) => prod.device)
    productions: Production[];

    @OneToMany(() => MaintenanceLog, (log) => log.device)
    maintenances: MaintenanceLog[];
    
    // devices_task
    // devices_cluster
}
