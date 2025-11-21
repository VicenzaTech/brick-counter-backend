import {
    Injectable,
    Logger,
    OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class PartitionManagerMinuteService implements OnApplicationBootstrap {
    private readonly logger = new Logger(PartitionManagerMinuteService.name);

    // Bật/tắt bằng env cho an toàn
    private readonly enabled = true
    // process.env.ENABLE_PARTITION_MANAGER === 'true';

    private readonly isTest = process.env.NODE_ENV === 'test';

    constructor(private readonly dataSource: DataSource) { }

    async onApplicationBootstrap() {
        if (!this.enabled || this.isTest) {
            this.logger.log('Minute partition manager disabled (env).');
            return;
        }

        try {
            // Khi app start, đảm bảo current minute + 1 minute sau
            await this.ensureMinutePartitions(1);
            this.logger.log('Ensured minute partitions on bootstrap.');
        } catch (e) {
            this.logger.error('Failed to ensure minute partitions on bootstrap', e);
        }
    }

    @Cron(CronExpression.EVERY_HOUR)
    async handleMinutePartitionCheck() {
        if (!this.enabled) {
            return;
        }

        this.logger.log('Running minute partition check for measurements...');
        try {
            await this.ensureMinutePartitions(1);
            this.logger.log('Minute partition check done.');
        } catch (e) {
            this.logger.error('Failed minute partition check', e);
        }
    }

    /**
     * Đảm bảo có partition cho:
     *  - phút hiện tại
     *  - extraMinutes phút tiếp theo
     *
     * Chỉ CREATE TABLE IF NOT EXISTS => không xoá gì, an toàn dev/prod.
     */
    private async ensureMinutePartitions(extraMinutes: number) {
        // Làm tròn xuống đầu phút
        const now = new Date();
        now.setSeconds(0, 0);

        for (let offset = 0; offset <= extraMinutes; offset++) {
            const fromDate = new Date(now.getTime() + offset * 60_000);
            const toDate = new Date(fromDate.getTime() + (1 * 60 * 60_000)); // +1 giờ

            const year = fromDate.getFullYear();
            const month = fromDate.getMonth() + 1;
            const day = fromDate.getDate();
            const hour = fromDate.getHours();
            const minute = fromDate.getMinutes();

            const nYear = toDate.getFullYear();
            const nMonth = toDate.getMonth() + 1;
            const nDay = toDate.getDate();
            const nHour = toDate.getHours();
            const nMinute = toDate.getMinutes();

            const pad = (n: number) => n.toString().padStart(2, '0');

            const name = `measurements_${year}${pad(month)}${pad(day)}_${pad(hour)}${pad(minute)}`;
            const fromStr = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:00`;
            const toStr = `${nYear}-${pad(nMonth)}-${pad(nDay)} ${pad(nHour)}:${pad(nMinute)}:00`;

            this.logger.log(`Ensuring minute partition ${name} [${fromStr} -> ${toStr})`);

            await this.dataSource.query(`
                CREATE TABLE IF NOT EXISTS ${name}
                PARTITION OF measurements
                FOR VALUES FROM ('${fromStr}') TO ('${toStr}');
            `);
        }
    }
}
