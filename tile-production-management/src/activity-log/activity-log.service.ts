import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityEntityType, ActivityStatus } from './entities/activity-log.enum';
import { LogDTO } from './dto/log.dto';
import { PaginationDTO } from 'src/common/type/pagination.type';

@Injectable()
export class ActivityLogService {
    constructor(
        @InjectRepository(ActivityLog)
        private readonly activityLogRepo: Repository<ActivityLog>,
    ) { }

    // FIND
    async findAll(
        dto: PaginationDTO & {
            actionType?: string;
            entityType?: string;
            userId?: string;
            status?: 'SUCCESS' | 'FAILED',
            timestamp?: '30day' | '24hour' | '7day' | 'all';
        },
    ) {
        const { page, limit, sort, order, actionType, entityType, userId, status, timestamp } = dto;

        const qb = this.activityLogRepo.createQueryBuilder('log');

        // WHERE
        if (actionType) {
            qb.andWhere('log.actionType = :actionType', { actionType });
        }

        if (entityType) {
            // nếu entityType là string enum, có thể cast:
            qb.andWhere('log.entityType = :entityType', {
                entityType: entityType as ActivityEntityType,
            });
        }

        if (typeof userId === 'string') {
            qb.andWhere('log.userId = :userId', { userId });
        }
        if (status) {
            qb.andWhere('log.status = :status', { status });
        }
        if (timestamp && timestamp !== 'all') {
            let dateFrom: Date;
            const now = new Date();
            switch (timestamp) {
                case '24hour':
                    dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7day':
                    dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30day':
                    dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    dateFrom = new Date(0); // mặc định từ epoch
            }
            qb.andWhere('log.createdAt >= :dateFrom', { dateFrom });
        }

        // JOIN USER TABLE
        qb.leftJoinAndSelect('log.user', 'user');
        
        // PAGINATION
        const pageNumber = page ?? 1;
        const pageSize = limit ?? 20;
        const skip = (pageNumber - 1) * pageSize;
        qb.skip(skip).take(pageSize);

        // SORT
        const allowedSortFields = [
            'createdAt',
            'action',
            'actionType',
            'severity',
            'status',
            'source',
            'entityType',
        ];

        if (sort && allowedSortFields.includes(sort)) {
            const direction =
                (order || 'asc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            qb.orderBy(`log.${sort}`, direction);
        } else {
            qb.orderBy('log.createdAt', 'DESC');
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            pagidata: items,
            meta: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }

    // CREATE LOG
    async log(dto: LogDTO) {
        const entity = this.activityLogRepo.create(dto);
        return this.activityLogRepo.save(entity);
    }

    async logSuccessful(dto: LogDTO) {
        return this.log({
            ...dto,
            status: ActivityStatus.SUCCESS,
        });
    }

    async logFailed(dto: LogDTO) {
        return this.log({
            ...dto,
            status: ActivityStatus.FAILED,
        });
    }
}
