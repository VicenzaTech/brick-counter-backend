import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    JoinTable,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm'
import { Role } from './role.entity'
import { ActivityLog } from 'src/activity-log/entities/activity-log.entity'

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ unique: true })
    email: string

    @Column({ unique: true })
    username: string

    @Column()
    passwordHash: string

    @Column({ default: true })
    isActive: boolean

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date

    @ManyToMany(() => Role, role => role.users, {
        cascade: true,
    })
    @JoinTable({
        name: 'user_roles',
        joinColumn: {
            name: 'user_id',
            referencedColumnName: 'id',
        },
        inverseJoinColumn: {
            name: 'role_id',
            referencedColumnName: 'id',
        },
    })
    roles: Role[]

    @OneToMany(() => ActivityLog, (log) => log.user)
    activityLogs: ActivityLog[];
}
