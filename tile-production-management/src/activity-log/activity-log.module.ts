import { Global, Module } from '@nestjs/common';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  imports: [TypeOrmModule.forFeature([ActivityLog]), AuthModule],
  exports: [ActivityLogService],
})
@Global()
export class ActivityLogModule {}
