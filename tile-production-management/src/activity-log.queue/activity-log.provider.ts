import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { LogDTO } from "src/activity-log/dto/log.dto";

@Injectable()
export class ActivityLogProvider {
    constructor(
        @InjectQueue('activity-log-queue')
        private readonly activityLogQueue: any,
    ) { }

    async logActivity(logData: LogDTO) {
        await this.activityLogQueue.add('log', logData);
    }

    async logSuccessActivity(logData: Omit<LogDTO, 'status'>) {
        await this.activityLogQueue.add('log', {
            ...logData,
            status: 'SUCCESS',
        });
    }

    async logFailedActivity(logData: Omit<LogDTO, 'status'>) {
        await this.activityLogQueue.add('log', {
            ...logData,
            status: 'FAILED',
        });
    }
}