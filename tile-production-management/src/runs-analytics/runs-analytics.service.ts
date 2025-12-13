import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionLineRunsService } from 'src/production-line-runs/production-line-runs.service';
import { ProductionRecord } from './types/record.type';
import { RunsAnalyticsQueryDto } from './dtos/runs-analytics-query.dto';
import {
    ANALYTICS_RANGE_PRESETS,
    AnalyticsAppliedRange,
    AnalyticsRangePreset,
    resolveAnalyticsDateRange,
} from './utils/date-range.util';
import { ProductionLine } from 'src/production-lines/entities/production-line.entity';

export interface RunsAnalyticsKpiCard {
    key: string;
    label: string;
    value: number;
    unit?: string;
}

export interface RunsAnalyticsFilters {
    productionLine: {
        selected: string;
        options: { id: string; label: string }[];
    };
    dateRange: {
        presets: { key: AnalyticsRangePreset; label: string }[];
        selectedPreset: AnalyticsAppliedRange;
        from: string;
        to: string;
    };
}

@Injectable()
export class RunsAnalyticsService {
    constructor(
        private readonly productionLineRunsService: ProductionLineRunsService,
        @InjectRepository(ProductionLine)
        private readonly productionLineRepository: Repository<ProductionLine>,
    ) { }

    async getRunsAnalytics(query: RunsAnalyticsQueryDto) {
        const productionLineId = query.productionLineId ?? 'all';
        const dateRange = resolveAnalyticsDateRange({
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            range: query.range,
        });

        const [records, filterOptions] = await Promise.all([
            this.productionLineRunsService.analyticsRuns(productionLineId, dateRange.fromDate, dateRange.toDate),
            this.loadProductionLineOptions(),
        ]);

        return {
            filters: this.buildFilters(filterOptions, productionLineId, dateRange.appliedRange, dateRange.fromDate, dateRange.toDate),
            kpiCards: this.buildKpiCards(records),
            records,
        };
    }

    private async loadProductionLineOptions(): Promise<{ id: string; label: string }[]> {
        const lines = await this.productionLineRepository.find({
            select: ['id', 'name'],
            order: { name: 'ASC' },
        });
        return [{ id: 'all', label: 'Tất cả đây chuyền' }, ...lines.map((line) => ({ id: String(line.id), label: line.name }))];
    }

    private buildFilters(
        lineOptions: { id: string; label: string }[],
        selectedLineId: string,
        appliedRange: AnalyticsAppliedRange,
        fromDate: Date,
        toDate: Date,
    ): RunsAnalyticsFilters {
        return {
            productionLine: {
                selected: selectedLineId,
                options: lineOptions,
            },
            dateRange: {
                presets: ANALYTICS_RANGE_PRESETS,
                selectedPreset: appliedRange,
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
            },
        };
    }

    private buildKpiCards(records: ProductionRecord[]): RunsAnalyticsKpiCard[] {
        const totals = records.reduce(
            (acc, record) => {
                acc.originalOutput += Number(record.originalOutput) || 0;
                acc.a1 += Number(record.a1) || 0;
                acc.wasteBeforeGrind += Number(record.waste_truoc_mai) || 0;
                acc.wasteFinished += Number(record.waste_thanh_pham) || 0;
                return acc;
            },
            {
                originalOutput: 0,
                a1: 0,
                wasteBeforeGrind: 0,
                wasteFinished: 0,
            },
        );

        const recordCount = records.length || 1;
        const totalOutput = totals.originalOutput;
        const a1Rate = totalOutput > 0 ? (totals.a1 / totalOutput) * 100 : 0;
        const avgWasteBeforeGrind = totals.wasteBeforeGrind / recordCount;
        const avgWasteFinished = totals.wasteFinished / recordCount;

        return [
            {
                key: 'total_output',
                label: 'Tổng sản lượng',
                value: this.roundMetric(totalOutput, 0),
                unit: 'viên',
            },
            {
                key: 'a1_rate',
                label: 'Tỷ lệ A1',
                value: this.roundMetric(a1Rate),
                unit: '%',
            },
            {
                key: 'waste_before_grind',
                label: 'Hao phí trước mài',
                value: this.roundMetric(avgWasteBeforeGrind),
                unit: '%',
            },
            {
                key: 'waste_finished',
                label: 'Hao phí thành phẩm',
                value: this.roundMetric(avgWasteFinished),
                unit: '%',
            },
        ];
    }

    private roundMetric(value: number, digits = 2): number {
        const factor = Math.pow(10, digits);
        return Math.round(value * factor) / factor;
    }
}
