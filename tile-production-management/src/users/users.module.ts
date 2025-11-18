import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { HashModule } from 'src/common/hash/hash.module';
import { RedisModule } from 'src/common/redis/redis.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Permission, Role]),
        HashModule,
        RedisModule
    ],
    providers: [
        UsersService
    ],
    exports: [
        UsersService
    ]
})
export class UsersModule { }
