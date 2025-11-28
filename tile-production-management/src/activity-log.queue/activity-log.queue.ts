import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ActivityLogProvider } from './activity-log.provider';
import { ActivityLogConsumer } from './activity-log.consumer';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'activity-log-queue',
        })
    ],
    providers: [ActivityLogProvider, ActivityLogConsumer],
    exports: [ActivityLogProvider],
})
@Global()
export class ActivityLogQueue {}
