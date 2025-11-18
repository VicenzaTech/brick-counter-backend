import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { RedisModule } from 'src/common/redis/redis.module';
import { HashModule } from 'src/common/hash/hash.module';

@Module({
    providers: [SessionService],
    imports: [RedisModule, HashModule],
    exports: [SessionService]
})
export class SessionModule { }
