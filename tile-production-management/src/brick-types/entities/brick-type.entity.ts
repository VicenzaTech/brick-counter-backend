import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Production } from '../../productions/entities/production.entity';
import { ProductionSummary } from '../../production-summaries/entities/production-summary.entity';

@Entity('brick_types')
export class BrickType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  unit?: string;

  @Column({ type: 'json', nullable: true })
  specs?: any;

  @OneToMany(() => Production, (prod) => prod.brickType)
  productions: Production[];

  @OneToMany(() => ProductionSummary, (sum) => sum.brickType)
  summaries: ProductionSummary[];
}
