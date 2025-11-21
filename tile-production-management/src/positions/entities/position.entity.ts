import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';
import { Device } from '../../devices/entities/device.entity';
import { Min } from 'class-validator';

@Entity('positions')
export class Position {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ type: String, nullable: true })
    coordinates?: string;

    @Column({ type: 'int', default: 1 })
    @Min(1)
    index: number;

    @ManyToOne(() => ProductionLine, (line) => line.positions)
    productionLine: ProductionLine;

    @OneToMany(() => Device, (device) => device.position)
    devices: Device[];
}
