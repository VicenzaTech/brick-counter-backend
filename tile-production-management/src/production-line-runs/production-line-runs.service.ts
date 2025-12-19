import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { ProductionLineRun } from './entities/production-line-run.entity';
import { CreateProductionLineRunDto } from './dtos/create-production-line-run.dto';
import { UpdateProductionLineRunDto } from './dtos/update-production-line-run.dto';
import { QueryProductionLineRunDto } from './dtos/query-production-line-run.dto';
import { ProductionRecord } from 'src/runs-analytics/types/record.type';
import { ProductionLineRunStatsQueryDto } from './dtos/run-statistics-query.dto';
import { ProductionLine } from 'src/production-lines/entities/production-line.entity';

export type StageCategory = 'press' | 'bisque' | 'glaze' | 'grind' | 'packaging';

export interface StageStartPayload {
    productionLineId: number;
    stageCategory: StageCategory;
    stageHistoryId: number;
    stageId: number;
    stageName: string;
    startTime?: Date;
    brickTypeId?: number;
}

export interface StageCompletionPayload extends StageStartPayload {
    endTime?: Date;
    quantity?: number;
    area?: number;
}

export interface ProductionLineRunStatisticsResponse {
    filters: {
        productionLineId?: number;
        workshopId?: number;
        brickTypeId?: number;
        from?: string;
        to?: string;
    };
    totals: {
        runs: number;
        completedRuns: number;
        inProgressRuns: number;
        draftRuns: number;
        totalPieces: number;
        totalAreaM2: number;
        averageDurationMinutes: number;
    };
    quality: {
        a1Pieces: number;
        a2Pieces: number;
        wastePieces: number;
        wasteRate: number;
        yieldPercent: number;
    };
    statusBreakdown: { status: string; count: number }[];
    topLines: {
        productionLineId: number | null;
        productionLineName: string;
        runCount: number;
        totalPieces: number;
        totalAreaM2: number;
    }[];
    charts: {
        statusDistribution: { labels: string[]; data: number[] };
        qualityPieces: { labels: string[]; data: number[] };
        outputByLine: { labels: string[]; data: number[] };
    };
}

@Injectable()
export class ProductionLineRunsService {
    constructor(
        @InjectRepository(ProductionLineRun)
        private readonly runRepository: Repository<ProductionLineRun>,
    ) { }

    async create(dto: CreateProductionLineRunDto): Promise<ProductionLineRun> {
        const run = this.runRepository.create({
            productionLineId: dto.productionLineId,
            brickTypeId: dto.brickTypeId,
            startTime: dto.startTime ? new Date(dto.startTime) : undefined,
            endTime: dto.endTime ? new Date(dto.endTime) : undefined,
            durationMinutes: dto.durationMinutes,
            totalPieces: dto.totalPieces ?? 0,
            totalAreaM2: dto.totalAreaM2 ?? 0,
            status: dto.status ?? 'draft',
            dataSource: dto.dataSource ?? 'manual',
            metadata: dto.metadata,
            notes: dto.notes,
            createdById: dto.createdById,
            updatedById: dto.updatedById ?? dto.createdById,
            pressStageHistoryId: dto.pressStageHistoryId,
            bisqueStageHistoryId: dto.bisqueStageHistoryId,
            glazeStageHistoryId: dto.glazeStageHistoryId,
            grindStageHistoryId: dto.grindStageHistoryId,
            packagingStageHistoryId: dto.packagingStageHistoryId,
            pressQuantity: dto.pressQuantity ?? 0,
            pressArea: dto.pressArea ?? 0,
            bisqueQuantity: dto.bisqueQuantity ?? 0,
            bisqueArea: dto.bisqueArea ?? 0,
            glazeQuantity: dto.glazeQuantity ?? 0,
            glazeArea: dto.glazeArea ?? 0,
            grindQuantity: dto.grindQuantity ?? 0,
            grindArea: dto.grindArea ?? 0,
            packagingQuantity: dto.packagingQuantity ?? 0,
            packagingArea: dto.packagingArea ?? 0,
            a1Pieces: dto.a1Pieces ?? 0,
            a2Pieces: dto.a2Pieces ?? 0,
            cutLoPieces: dto.cutLoPieces ?? 0,
            phe1Pieces: dto.phe1Pieces ?? 0,
            phe2Pieces: dto.phe2Pieces ?? 0,
            pheHuyPieces: dto.pheHuyPieces ?? 0,
        });
        this.recomputeDuration(run);
        run.metadata = this.computeDerivedMetadata(run);
        return this.runRepository.save(run);
    }

    async findAll(query: QueryProductionLineRunDto) {
        const { productionLineId, brickTypeId, from, to, offset = 0, limit = 50 } = query;
        const qb = this.runRepository
            .createQueryBuilder('run')
            .leftJoinAndSelect('run.productionLine', 'line')
            .leftJoinAndSelect('run.brickType', 'brickType')
            .select([
                'run.id',
                'run.startTime',
                'run.endTime',
                'run.totalPieces',
                'run.totalAreaM2',
                'run.a1Pieces',
                'run.a2Pieces',
                'run.cutLoPieces',
                'run.phe1Pieces',
                'run.phe2Pieces',
                'run.status',
                'run.pheHuyPieces',
                'line.id',
                'line.name',
                'brickType.id',
                'brickType.name',
            ])
            .orderBy('run.startTime', 'DESC')
            .skip(offset)
            .take(limit);

        if (productionLineId) {
            qb.andWhere('run.productionLineId = :productionLineId', { productionLineId });
        }
        if (brickTypeId) {
            qb.andWhere('run.brickTypeId = :brickTypeId', { brickTypeId });
        }
        if (from) {
            qb.andWhere('run.startTime >= :from', { from });
        }
        if (to) {
            qb.andWhere('run.endTime <= :to', { to });
        }

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    async findOne(id: number): Promise<ProductionLineRun> {
        const run = await this.runRepository.findOne({
            where: { id },
            relations: [
                'productionLine',
                'brickType',
                'pressStageHistory',
                'bisqueStageHistory',
                'glazeStageHistory',
                'grindStageHistory',
                'packagingStageHistory',
            ],
        });
        if (!run) {
            throw new NotFoundException(`Production line run ${id} not found`);
        }
        return run;
    }

    async update(id: number, dto: UpdateProductionLineRunDto): Promise<ProductionLineRun> {
        const run = await this.runRepository.findOne({ where: { id } });
        if (!run) {
            throw new NotFoundException(`Production line run ${id} not found`);
        }

        const startTime = dto.startTime ? new Date(dto.startTime) : run.startTime;
        const endTime = dto.endTime ? new Date(dto.endTime) : run.endTime;

        Object.assign(run, {
            productionLineId: dto.productionLineId ?? run.productionLineId,
            brickTypeId: dto.brickTypeId ?? run.brickTypeId,
            startTime,
            endTime,
            durationMinutes: dto.durationMinutes ?? run.durationMinutes,
            totalPieces: dto.totalPieces ?? run.totalPieces,
            totalAreaM2: dto.totalAreaM2 ?? run.totalAreaM2,
            status: dto.status ?? run.status,
            dataSource: dto.dataSource ?? run.dataSource,
            metadata: dto.metadata ?? run.metadata,
            notes: dto.notes ?? run.notes,
            updatedById: dto.updatedById ?? run.updatedById,
            pressStageHistoryId: dto.pressStageHistoryId ?? run.pressStageHistoryId,
            bisqueStageHistoryId: dto.bisqueStageHistoryId ?? run.bisqueStageHistoryId,
            glazeStageHistoryId: dto.glazeStageHistoryId ?? run.glazeStageHistoryId,
            grindStageHistoryId: dto.grindStageHistoryId ?? run.grindStageHistoryId,
            packagingStageHistoryId: dto.packagingStageHistoryId ?? run.packagingStageHistoryId,
            pressQuantity: dto.pressQuantity ?? run.pressQuantity,
            pressArea: dto.pressArea ?? run.pressArea,
            bisqueQuantity: dto.bisqueQuantity ?? run.bisqueQuantity,
            bisqueArea: dto.bisqueArea ?? run.bisqueArea,
            glazeQuantity: dto.glazeQuantity ?? run.glazeQuantity,
            glazeArea: dto.glazeArea ?? run.glazeArea,
            grindQuantity: dto.grindQuantity ?? run.grindQuantity,
            grindArea: dto.grindArea ?? run.grindArea,
            packagingQuantity: dto.packagingQuantity ?? run.packagingQuantity,
            packagingArea: dto.packagingArea ?? run.packagingArea,
            a1Pieces: dto.a1Pieces ?? run.a1Pieces,
            a2Pieces: dto.a2Pieces ?? run.a2Pieces,
            cutLoPieces: dto.cutLoPieces ?? run.cutLoPieces,
            phe1Pieces: dto.phe1Pieces ?? run.phe1Pieces,
            phe2Pieces: dto.phe2Pieces ?? run.phe2Pieces,
            pheHuyPieces: dto.pheHuyPieces ?? run.pheHuyPieces,
        });

        this.recomputeDuration(run);
        run.metadata = this.computeDerivedMetadata(run);
        return this.runRepository.save(run);
    }

    async remove(id: number): Promise<void> {
        const run = await this.runRepository.findOne({ where: { id } });
        if (!run) {
            throw new NotFoundException(`Production line run ${id} not found`);
        }
        await this.runRepository.remove(run);
    }

    async getStatistics(query: ProductionLineRunStatsQueryDto): Promise<ProductionLineRunStatisticsResponse> {
        const [summary, statusRows, lineRows] = await Promise.all([
            this.buildSummaryQuery(query).getRawOne(),
            this.buildStatusBreakdownQuery(query).getRawMany(),
            this.buildLineBreakdownQuery(query).getRawMany(),
        ]);

        const totalRuns = this.parseNumber(summary?.run_count);
        const totalPieces = this.parseNumber(summary?.total_pieces);
        const totalArea = this.parseNumber(summary?.total_area);
        const completedRuns = this.parseNumber(summary?.completed_runs);
        const inProgressRuns = this.parseNumber(summary?.in_progress_runs);
        const draftRuns = this.parseNumber(summary?.draft_runs);
        const avgDuration = this.parseNumber(summary?.avg_duration_minutes);

        const a1Pieces = this.parseNumber(summary?.a1_pieces);
        const a2Pieces = this.parseNumber(summary?.a2_pieces);
        const wastePieces =
            this.parseNumber(summary?.cut_lo_pieces) +
            this.parseNumber(summary?.phe1_pieces) +
            this.parseNumber(summary?.phe2_pieces) +
            this.parseNumber(summary?.phe_huy_pieces);
        const wasteRate = totalPieces > 0 ? (wastePieces / totalPieces) * 100 : 0;
        const yieldPercent = totalPieces > 0 ? (a1Pieces / totalPieces) * 100 : 0;

        const statusBreakdown = statusRows.map((row) => ({
            status: row.status ?? 'unknown',
            count: this.parseNumber(row.count),
        }));

        const topLines = lineRows.map((row) => ({
            productionLineId: row.line_id !== null ? Number(row.line_id) : null,
            productionLineName: row.line_name ?? 'Unknown line',
            runCount: this.parseNumber(row.run_count),
            totalPieces: this.parseNumber(row.total_pieces),
            totalAreaM2: this.parseNumber(row.total_area),
        }));

        return {
            filters: {
                productionLineId: query.productionLineId,
                workshopId: query.workshopId,
                brickTypeId: query.brickTypeId,
                from: query.from,
                to: query.to,
            },
            totals: {
                runs: totalRuns,
                completedRuns,
                inProgressRuns,
                draftRuns,
                totalPieces,
                totalAreaM2: totalArea,
                averageDurationMinutes: Math.round(avgDuration * 100) / 100,
            },
            quality: {
                a1Pieces,
                a2Pieces,
                wastePieces,
                wasteRate: Math.round(wasteRate * 100) / 100,
                yieldPercent: Math.round(yieldPercent * 100) / 100,
            },
            statusBreakdown,
            topLines,
            charts: {
                statusDistribution: {
                    labels: statusBreakdown.map((item) => item.status),
                    data: statusBreakdown.map((item) => item.count),
                },
                qualityPieces: {
                    labels: ['A1', 'A2', 'Waste'],
                    data: [a1Pieces, a2Pieces, wastePieces],
                },
                outputByLine: {
                    labels: topLines.map((item) => item.productionLineName),
                    data: topLines.map((item) => item.totalPieces),
                },
            },
        };
    }

    async registerStageStart(payload: StageStartPayload): Promise<ProductionLineRun> {
        if (!['press', 'grind'].includes(payload.stageCategory)) {
            return this.getOrCreateActiveRun(payload.productionLineId, payload.startTime, payload.brickTypeId);
        }

        const run = await this.getOrCreateActiveRun(payload.productionLineId, payload.startTime, payload.brickTypeId);

        if (payload.stageCategory === 'press') {
            run.pressStageHistoryId = payload.stageHistoryId;
        } else if (payload.stageCategory === 'grind') {
            run.grindStageHistoryId = payload.stageHistoryId;
        }

        if (!run.startTime || (payload.startTime && run.startTime > payload.startTime)) {
            run.startTime = payload.startTime;
        }
        run.status = 'in_progress';
        return this.runRepository.save(run);
    }

    async registerStageCompletion(payload: StageCompletionPayload): Promise<ProductionLineRun> {
        const run = await this.getOrCreateActiveRun(payload.productionLineId, payload.startTime, payload.brickTypeId);

        switch (payload.stageCategory) {
            case 'press':
                run.pressStageHistoryId = payload.stageHistoryId;
                run.pressQuantity = this.resolveNumber(payload.quantity, run.pressQuantity);
                run.pressArea = this.resolveNumber(payload.area, run.pressArea);
                break;
            case 'bisque':
                run.bisqueStageHistoryId = payload.stageHistoryId;
                run.bisqueQuantity = this.resolveNumber(payload.quantity, run.bisqueQuantity);
                run.bisqueArea = this.resolveNumber(payload.area, run.bisqueArea);
                break;
            case 'glaze':
                run.glazeStageHistoryId = payload.stageHistoryId;
                run.glazeQuantity = this.resolveNumber(payload.quantity, run.glazeQuantity);
                run.glazeArea = this.resolveNumber(payload.area, run.glazeArea);
                break;
            case 'grind':
                run.grindStageHistoryId = payload.stageHistoryId;
                run.grindQuantity = this.resolveNumber(payload.quantity, run.grindQuantity);
                run.grindArea = this.resolveNumber(payload.area, run.grindArea);
                break;
            case 'packaging':
                run.packagingStageHistoryId = payload.stageHistoryId;
                run.packagingQuantity = this.resolveNumber(payload.quantity, run.packagingQuantity);
                run.packagingArea = this.resolveNumber(payload.area, run.packagingArea);
                run.totalPieces = run.packagingQuantity;
                run.totalAreaM2 = run.packagingArea;
                run.endTime = payload.endTime ?? payload.startTime ?? run.endTime;
                run.status = 'completed';
                break;
        }

        if (!run.startTime || (payload.startTime && run.startTime > payload.startTime)) {
            run.startTime = payload.startTime;
        }
        this.recomputeDuration(run);
        run.metadata = this.computeDerivedMetadata(run);
        return this.runRepository.save(run);
    }

    private async getOrCreateActiveRun(
        productionLineId: number,
        startTime?: Date,
        brickTypeId?: number,
    ): Promise<ProductionLineRun> {
        let run = await this.runRepository.findOne({
            where: { productionLineId, status: 'in_progress' },
            order: { startTime: 'DESC', id: 'DESC' },
        });

        if (!run) {
            run = this.runRepository.create({
                productionLineId,
                brickTypeId,
                startTime,
                status: 'in_progress',
                dataSource: 'auto',
            });
        } else {
            if (!run.startTime || (startTime && run.startTime > startTime)) {
                run.startTime = startTime;
            }
            if (!run.brickTypeId && brickTypeId) {
                run.brickTypeId = brickTypeId;
            }
        }

        return this.runRepository.save(run);
    }

    private recomputeDuration(run: ProductionLineRun): void {
        if (run.startTime && run.endTime) {
            run.durationMinutes = Math.max(
                0,
                Math.round((run.endTime.getTime() - run.startTime.getTime()) / 60000),
            );
        }
    }

    private resolveNumber(input: number | undefined, fallback: number): number {
        if (input === undefined || input === null || Number.isNaN(Number(input))) {
            return fallback ?? 0;
        }
        return Number(input);
    }

    private computeDerivedMetadata(run: ProductionLineRun): Record<string, any> {
        const metadata = { ...(run.metadata ?? {}) };
        const { pressQuantity, grindQuantity, packagingQuantity } = run;

        if (pressQuantity && packagingQuantity) {
            metadata.pressYieldPercent = this.calculateYield(packagingQuantity, pressQuantity);
            metadata.pressLoss = this.resolveNumber(pressQuantity - packagingQuantity, 0);
        }
        if (grindQuantity && packagingQuantity) {
            metadata.grindYieldPercent = this.calculateYield(packagingQuantity, grindQuantity);
        }
        return metadata;
    }

    private calculateYield(output: number, input: number): number | undefined {
        if (!input || input <= 0) {
            return undefined;
        }
        return Math.round((output / input) * 10000) / 100;
    }

    async analyticsRuns(productionLineId: 'all' | string, fromDate: Date, toDate: Date): Promise<ProductionRecord[]> {
        const qb = this.runRepository
            .createQueryBuilder('run')
            .leftJoin('run.productionLine', 'line')
            .leftJoin('run.brickType', 'brickType')
            .where('COALESCE(run.endTime, run.startTime) BETWEEN :fromDate AND :toDate', { fromDate, toDate })
            .orderBy('COALESCE(run.endTime, run.startTime)', 'ASC')
            .select('run.id', 'run_id')
            .addSelect('run.startTime', 'run_start_time')
            .addSelect('run.endTime', 'run_end_time')
            .addSelect('run.totalPieces', 'run_total_pieces')
            .addSelect('run.totalAreaM2', 'run_total_area_m2')
            .addSelect('run.a1Pieces', 'run_a1_pieces')
            .addSelect('run.a2Pieces', 'run_a2_pieces')
            .addSelect('run.cutLoPieces', 'run_cut_lo_pieces')
            .addSelect('run.phe1Pieces', 'run_phe1_pieces')
            .addSelect('run.phe2Pieces', 'run_phe2_pieces')
            .addSelect('run.pheHuyPieces', 'run_phe_huy_pieces')
            .addSelect('line.name', 'line_name')
            .addSelect('brickType.name', 'brick_type_name');

        if (productionLineId !== 'all') {
            qb.andWhere('run.productionLineId = :productionLineId', { productionLineId: Number(productionLineId) });
        }

        const rows = await qb.getRawMany();

        return rows.map((row) => {
            const totalPieces = this.resolveNumber(row.run_total_pieces, 0);
            const a1Pieces = this.resolveNumber(row.run_a1_pieces, 0);
            const a2Pieces = this.resolveNumber(row.run_a2_pieces, 0);
            const cutLoPieces = this.resolveNumber(row.run_cut_lo_pieces, 0);
            const phe1Pieces = this.resolveNumber(row.run_phe1_pieces, 0);
            const phe2Pieces = this.resolveNumber(row.run_phe2_pieces, 0);
            const pheHuyPieces = this.resolveNumber(row.run_phe_huy_pieces, 0);
            const totalAreaM2 = this.resolveNumber(row.run_total_area_m2, 0);
            const outputDate = row.run_end_time ?? row.run_start_time;
            const date = outputDate ? new Date(outputDate).toISOString().split('T')[0] : '';

            const wasteMoc = totalPieces > 0 ? Math.round(((phe1Pieces + phe2Pieces) / totalPieces) * 10000) / 100 : 0;
            const wasteLo = totalPieces > 0 ? Math.round((cutLoPieces / totalPieces) * 10000) / 100 : 0;
            const wasteTruocMai =
                totalPieces > 0
                    ? Math.round(((phe1Pieces + phe2Pieces + cutLoPieces) / totalPieces) * 10000) / 100
                    : 0;
            const wasteThanhPham =
                totalPieces > 0
                    ? Math.round(((phe1Pieces + phe2Pieces + cutLoPieces + pheHuyPieces) / totalPieces) * 10000) / 100
                    : 0;

            return {
                key: `${row.run_id}`,
                date,
                lineName: row.line_name ?? 'Unknown line',
                productType: row.brick_type_name ?? 'Unknown',
                originalOutput: totalPieces,
                totalAreaM2,
                a1: a1Pieces,
                a2: a2Pieces,
                cut: cutLoPieces,
                waste1: phe1Pieces,
                waste2: phe2Pieces,
                scrap: pheHuyPieces,
                waste_moc: wasteMoc,
                waste_lo: wasteLo,
                waste_truoc_mai: wasteTruocMai,
                waste_thanh_pham: wasteThanhPham,
            };
        });
    }

    private buildSummaryQuery(query: ProductionLineRunStatsQueryDto) {
        const qb = this.runRepository
            .createQueryBuilder('run')
            .leftJoin('run.productionLine', 'line')
            .select('COUNT(run.id)', 'run_count')
            .addSelect(`SUM(CASE WHEN run.status = 'completed' THEN 1 ELSE 0 END)`, 'completed_runs')
            .addSelect(`SUM(CASE WHEN run.status = 'in_progress' THEN 1 ELSE 0 END)`, 'in_progress_runs')
            .addSelect(`SUM(CASE WHEN run.status = 'draft' THEN 1 ELSE 0 END)`, 'draft_runs')
            .addSelect('SUM(run.totalPieces)', 'total_pieces')
            .addSelect('SUM(run.totalAreaM2)', 'total_area')
            .addSelect('SUM(run.a1Pieces)', 'a1_pieces')
            .addSelect('SUM(run.a2Pieces)', 'a2_pieces')
            .addSelect('SUM(run.cutLoPieces)', 'cut_lo_pieces')
            .addSelect('SUM(run.phe1Pieces)', 'phe1_pieces')
            .addSelect('SUM(run.phe2Pieces)', 'phe2_pieces')
            .addSelect('SUM(run.pheHuyPieces)', 'phe_huy_pieces')
            .addSelect('AVG(run.durationMinutes)', 'avg_duration_minutes');

        this.applyStatisticsFilters(qb, query);
        return qb;
    }

    private buildStatusBreakdownQuery(query: ProductionLineRunStatsQueryDto) {
        const qb = this.runRepository
            .createQueryBuilder('run')
            .leftJoin('run.productionLine', 'line')
            .select('run.status', 'status')
            .addSelect('COUNT(run.id)', 'count')
            .groupBy('run.status');

        this.applyStatisticsFilters(qb, query);
        return qb;
    }

    private buildLineBreakdownQuery(query: ProductionLineRunStatsQueryDto) {
        const qb = this.runRepository
            .createQueryBuilder('run')
            .leftJoin('run.productionLine', 'line')
            .select('line.id', 'line_id')
            .addSelect('line.name', 'line_name')
            .addSelect('COUNT(run.id)', 'run_count')
            .addSelect('SUM(run.totalPieces)', 'total_pieces')
            .addSelect('SUM(run.totalAreaM2)', 'total_area')
            .groupBy('line.id')
            .addGroupBy('line.name')
            .orderBy('SUM(run.totalPieces)', 'DESC')
            .limit(10);

        this.applyStatisticsFilters(qb, query);
        return qb;
    }

    private applyStatisticsFilters<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, query: ProductionLineRunStatsQueryDto): void {
        if (query.productionLineId) {
            qb.andWhere('run.productionLineId = :productionLineId', { productionLineId: query.productionLineId });
        }
        if (query.workshopId) {
            const workshopSubQuery = qb
                .subQuery()
                .select('line_filter.id')
                .from(ProductionLine, 'line_filter')
                .innerJoin('line_filter.workshop', 'workshop_filter')
                .where('workshop_filter.id = :workshopId')
                .getQuery();
            qb.andWhere(`run.productionLineId IN ${workshopSubQuery}`, { workshopId: query.workshopId });
        }
        if (query.brickTypeId) {
            qb.andWhere('run.brickTypeId = :brickTypeId', { brickTypeId: query.brickTypeId });
        }
        if (query.from) {
            const fromDate = new Date(query.from);
            qb.andWhere('COALESCE(run.startTime, run.endTime) >= :fromDate', { fromDate });
        }
        if (query.to) {
            const toDate = new Date(query.to);
            qb.andWhere('COALESCE(run.endTime, run.startTime) <= :toDate', { toDate });
        }
    }

    private parseNumber(value: any): number {
        const parsed = Number(value ?? 0);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}
