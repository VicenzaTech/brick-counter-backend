import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionLineRun } from './entities/production-line-run.entity';
import { CreateProductionLineRunDto } from './dtos/create-production-line-run.dto';
import { UpdateProductionLineRunDto } from './dtos/update-production-line-run.dto';
import { QueryProductionLineRunDto } from './dtos/query-production-line-run.dto';
import { ProductionRecord } from 'src/runs-analytics/types/record.type';

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
}
