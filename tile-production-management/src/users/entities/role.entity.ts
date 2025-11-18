import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm'
import { User } from './user.entity'
import { Permission } from './permission.entity'

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true }) // ví dụ: 'admin', 'staff'
  slug: string

  @Column() // ví dụ: 'Administrator'
  name: string

  @Column({ nullable: true })
  description?: string

  @ManyToMany(() => Permission, permission => permission.roles, {
    cascade: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
    },
  })
  permissions: Permission[]

  @ManyToMany(() => User, user => user.roles)
  users: User[]
}
