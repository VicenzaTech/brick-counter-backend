import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductionLine } from '../../production-lines/entities/production-line.entity';
import { WorkshopTarget } from 'src/workshop-target/entities/workshop-target.entity';

@Entity('workshops')
export class Workshop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ default: 'active' })
  status: string;

  @OneToMany(() => ProductionLine, (line) => line.workshop)
  lines: ProductionLine[];

  @OneToMany(() => WorkshopTarget, (target) => target.workshop)
  targets: WorkshopTarget[];
}
