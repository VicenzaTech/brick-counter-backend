import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { WorkshopTarget } from './entities/workshop-target.entity';
import { CreateWorkshopTargetDto, UpdateWorkshopTargetDto, WorkshopTargetQueryDto } from './dtos/workshop-target.dto';
import { Workshop } from 'src/workshops/entities/workshop.entity';
import { REDIS_PROVIDER } from 'src/common/redis/redis.constant';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

export interface WorkshopTargetChartPoint {
    year: number;
    target: number;
}

export interface WorkshopTargetChartSeries {
    workshopId: number;
    workshopName: string;
    points: WorkshopTargetChartPoint[];
    totalTarget: number;
}

export interface WorkshopTargetResponse {
    id: number;
    name: string;
    workshopId: number;
    workshopName: string;
    year: number;
    yearlyTarget: number;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkshopTargetListResponse {
    filters: {
        selectedYear?: number;
        selectedWorkshopId?: number;
        years: number[];
        workshops: { id: number; name: string }[];
        includeHistory: boolean;
    };
    items: WorkshopTargetResponse[];
    chart: WorkshopTargetChartSeries[];
}

@Injectable()
export class WorkshopTargetService {
    private readonly logger = new Logger(WorkshopTargetService.name);
    private readonly CACHE_TTL_MS = 120_000;
    private readonly cachePrefix = 'workshop-target:list';
    private readonly memoryCache = new Map<string, CacheEntry<WorkshopTargetListResponse>>();
    private readonly trackedCacheKeys = new Set<string>();

    constructor(
        @InjectRepository(WorkshopTarget)
        private readonly targetRepository: Repository<WorkshopTarget>,
        @InjectRepository(Workshop)
        private readonly workshopRepository: Repository<Workshop>,
        @Inject(REDIS_PROVIDER)
        private readonly redis: Redis,
    ) { }

    async create(dto: CreateWorkshopTargetDto): Promise<WorkshopTargetResponse> {
        const workshop = await this.findWorkshopOrThrow(dto.workshopId);

        const entity = this.targetRepository.create({
            name: dto.name.trim(),
            workshopId: workshop.id,
            workshop,
            year: dto.year,
            yearlyTarget: this.round(dto.yearlyTarget),
            description: dto.description?.trim(),
        });

        try {
            const saved = await this.targetRepository.save(entity);
            saved.workshop = workshop;
            await this.invalidateCache();
            return this.toResponse(saved);
        } catch (error: any) {
            if (error?.code === '23505') {
                throw new ConflictException('Đã tồn tại chỉ tiêu cho nhà máy và năm này');
            }
            this.logger.error('Failed to create workshop target', error?.stack || error);
            throw error;
        }
    }

    async findAll(query: WorkshopTargetQueryDto): Promise<WorkshopTargetListResponse> {
        const cacheKey = this.buildCacheKey(query);
        const cached = await this.getCachedResponse(cacheKey);
        if (cached) {
            return cached;
        }

        const qb = this.targetRepository
            .createQueryBuilder('target')
            .leftJoinAndSelect('target.workshop', 'workshop')
            .orderBy('target.year', 'DESC')
            .addOrderBy('workshop.name', 'ASC');

        if (query.workshopId) {
            qb.andWhere('target.workshopId = :workshopId', { workshopId: query.workshopId });
        }

        if (query.year) {
            qb.andWhere('target.year = :year', { year: query.year });
        } else if (!query.includeHistory) {
            qb.andWhere('target.year >= :currentYear', { currentYear: new Date().getFullYear() });
        }

        const entities = await qb.getMany();
        const response = this.buildListResponse(entities, query);
        await this.setCachedResponse(cacheKey, response);
        return response;
    }

    async findOne(id: number): Promise<WorkshopTargetResponse> {
        const target = await this.targetRepository.findOne({
            where: { id },
            relations: ['workshop'],
        });
        if (!target) {
            throw new NotFoundException(`Không tìm thấy chỉ tiêu nhà máy #${id}`);
        }
        return this.toResponse(target);
    }

    async update(
        id: number,
        dto: UpdateWorkshopTargetDto,
    ): Promise<{ previous: WorkshopTargetResponse; current: WorkshopTargetResponse }> {
        const target = await this.targetRepository.findOne({
            where: { id },
            relations: ['workshop'],
        });
        if (!target) {
            throw new NotFoundException(`Không tìm thấy chỉ tiêu nhà máy #${id}`);
        }

        const before = this.toResponse(target);

        if (dto.workshopId && dto.workshopId !== target.workshopId) {
            const workshop = await this.findWorkshopOrThrow(dto.workshopId);
            target.workshopId = workshop.id;
            target.workshop = workshop;
        }

        if (dto.name) {
            target.name = dto.name.trim();
        }

        if (dto.description !== undefined) {
            target.description = dto.description?.trim();
        }

        if (dto.year) {
            target.year = dto.year;
        }

        if (dto.yearlyTarget !== undefined) {
            target.yearlyTarget = this.round(dto.yearlyTarget);
        }

        try {
            const saved = await this.targetRepository.save(target);
            await this.invalidateCache();
            return {
                previous: before,
                current: this.toResponse(saved),
            };
        } catch (error: any) {
            if (error?.code === '23505') {
                throw new ConflictException('Đã tồn tại chỉ tiêu cho nhà máy và năm này');
            }
            this.logger.error('Failed to update workshop target', error?.stack || error);
            throw error;
        }
    }

    async remove(id: number): Promise<WorkshopTargetResponse> {
        const target = await this.targetRepository.findOne({
            where: { id },
            relations: ['workshop'],
        });
        if (!target) {
            throw new NotFoundException(`Không tìm thấy chỉ tiêu nhà máy #${id}`);
        }

        await this.targetRepository.remove(target);
        await this.invalidateCache();
        return this.toResponse(target);
    }

    private async findWorkshopOrThrow(workshopId: number): Promise<Workshop> {
        const workshop = await this.workshopRepository.findOne({ where: { id: workshopId } });
        if (!workshop) {
            throw new NotFoundException(`Không tìm thấy nhà máy #${workshopId}`);
        }
        return workshop;
    }

    private buildListResponse(
        targets: WorkshopTarget[],
        query: WorkshopTargetQueryDto,
    ): WorkshopTargetListResponse {
        const responses = targets.map((target) => this.toResponse(target));
        const chart = this.buildChartSeries(responses);
        const years = Array.from(new Set(responses.map((item) => item.year))).sort((a, b) => a - b);
        const workshopsMap = new Map<number, string>();
        responses.forEach((item) => {
            workshopsMap.set(item.workshopId, item.workshopName);
        });

        return {
            filters: {
                selectedYear: query.year,
                selectedWorkshopId: query.workshopId,
                years,
                workshops: Array.from(workshopsMap.entries()).map(([id, name]) => ({ id, name })),
                includeHistory: Boolean(query.includeHistory),
            },
            items: responses,
            chart,
        };
    }

    private buildChartSeries(responses: WorkshopTargetResponse[]): WorkshopTargetChartSeries[] {
        const grouped = new Map<number, WorkshopTargetChartSeries>();

        responses.forEach((item) => {
            const existing = grouped.get(item.workshopId);
            if (!existing) {
                grouped.set(item.workshopId, {
                    workshopId: item.workshopId,
                    workshopName: item.workshopName,
                    points: [{ year: item.year, target: item.yearlyTarget }],
                    totalTarget: this.round(item.yearlyTarget),
                });
                return;
            }
            existing.points.push({ year: item.year, target: item.yearlyTarget });
            existing.totalTarget = this.round(existing.totalTarget + item.yearlyTarget);
        });

        return Array.from(grouped.values()).map((series) => ({
            ...series,
            points: series.points.sort((a, b) => a.year - b.year),
        }));
    }

    private toResponse(target: WorkshopTarget): WorkshopTargetResponse {
        const workshopName = target.workshop?.name ?? 'Chưa phân xưởng';
        return {
            id: target.id,
            name: target.name,
            workshopId: target.workshopId,
            workshopName,
            year: target.year,
            yearlyTarget: this.round(target.yearlyTarget),
            description: target.description ?? undefined,
            createdAt: target.createdAt,
            updatedAt: target.updatedAt,
        };
    }
    private round(value: number, digits = 2): number {
        const factor = Math.pow(10, digits);
        return Math.round(Number(value || 0) * factor) / factor;
    }

    private buildCacheKey(query: WorkshopTargetQueryDto): string {
        const workshopKey = query.workshopId ?? 'all';
        const yearKey = query.year ?? 'all';
        const historyKey = query.includeHistory ? 'history' : 'current';
        return `${this.cachePrefix}:workshop:${workshopKey}:year:${yearKey}:${historyKey}`;
    }

    private async getCachedResponse(key: string): Promise<WorkshopTargetListResponse | null> {
        const entry = this.memoryCache.get(key);
        if (entry && entry.expiresAt > Date.now()) {
            return entry.data;
        }
        if (entry) {
            this.memoryCache.delete(key);
        }

        try {
            const raw = await this.redis.get(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as WorkshopTargetListResponse;
            this.memoryCache.set(key, { data: parsed, expiresAt: Date.now() + this.CACHE_TTL_MS });
            this.trackedCacheKeys.add(key);
            return parsed;
        } catch (error) {
            this.logger.warn(`Failed to hydrate workshop-target cache ${key}: ${error}`);
            return null;
        }
    }

    private async setCachedResponse(key: string, value: WorkshopTargetListResponse): Promise<void> {
        this.memoryCache.set(key, { data: value, expiresAt: Date.now() + this.CACHE_TTL_MS });
        this.trackedCacheKeys.add(key);
        try {
            await this.redis.set(key, JSON.stringify(value), 'PX', this.CACHE_TTL_MS);
        } catch (error) {
            this.logger.warn(`Failed to persist workshop-target cache ${key}: ${error}`);
        }
    }

    private async invalidateCache(): Promise<void> {
        this.memoryCache.clear();
        if (!this.trackedCacheKeys.size) {
            return;
        }

        const keys = Array.from(this.trackedCacheKeys.values());
        this.trackedCacheKeys.clear();
        try {
            await this.redis.del(...keys);
        } catch (error) {
            this.logger.warn(`Failed to invalidate workshop-target cache keys: ${error}`);
        }
    }
}
