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

        const now = new Date();
        const endOfToday = new Date(now);
        endOfToday.setUTCHours(23, 59, 59, 999);
        let effectiveToDate = dateRange.toDate > endOfToday ? endOfToday : dateRange.toDate;
        let effectiveFromDate = dateRange.fromDate;
        if (effectiveFromDate > effectiveToDate) {
            effectiveFromDate = new Date(effectiveToDate);
            effectiveFromDate.setUTCHours(0, 0, 0, 0);
        }

        const [rawRecords, filterOptions] = await Promise.all([
            this.productionLineRunsService.analyticsRuns(productionLineId, effectiveFromDate, effectiveToDate),
            this.loadProductionLineOptions(),
        ]);

        const selectedLineLabel = this.resolveLineLabel(filterOptions, productionLineId);
        const records = this.aggregateRecords(
            rawRecords,
            effectiveFromDate,
            effectiveToDate,
            dateRange.appliedRange,
            selectedLineLabel,
        );

        return {
            filters: this.buildFilters(filterOptions, productionLineId, dateRange.appliedRange, effectiveFromDate, effectiveToDate),
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

    private resolveLineLabel(options: { id: string; label: string }[], selectedId: string): string {
        const found = options.find((option) => option.id === selectedId);
        if (found) {
            return found.label;
        }
        if (selectedId === 'all') {
            return 'Tất cả dây chuyền';
        }
        return `Dây chuyền ${selectedId}`;
    }

    private aggregateRecords(
        rawRecords: ProductionRecord[],
        fromDate: Date,
        toDate: Date,
        appliedRange: AnalyticsAppliedRange,
        lineLabel: string,
    ): ProductionRecord[] {
        const DAY_MS = 24 * 60 * 60 * 1000;
        const totalDays = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1);
        const useMonthly = appliedRange === '12m' || totalDays > 92;

        const buckets: { key: string; start: Date; end: Date; label: string }[] = [];

        if (useMonthly) {
            const endMonthIndex = toDate.getUTCFullYear() * 12 + toDate.getUTCMonth();
            const startMonthIndex = fromDate.getUTCFullYear() * 12 + fromDate.getUTCMonth();
            const monthsBetween = Math.max(1, endMonthIndex - startMonthIndex + 1);
            const limit = appliedRange === '12m' || monthsBetween > 12 ? 12 : monthsBetween;
            for (let offset = limit - 1; offset >= 0; offset--) {
                const monthIndex = endMonthIndex - offset;
                const year = Math.floor(monthIndex / 12);
                const month = monthIndex % 12;
                const bucketStart = new Date(Date.UTC(year, month, 1));
                if (bucketStart < fromDate) {
                    continue;
                }
                const nextMonth = new Date(Date.UTC(year, month + 1, 1));
                const bucketEnd = new Date(nextMonth.getTime() - 1);
                buckets.push({
                    key: `${year}-${String(month + 1).padStart(2, '0')}`,
                    start: bucketStart,
                    end: bucketEnd <= toDate ? bucketEnd : new Date(toDate.getTime()),
                    label: `${year}-${String(month + 1).padStart(2, '0')}`,
                });
            }
            if (!buckets.length) {
                const monthIndex = endMonthIndex;
                const year = Math.floor(monthIndex / 12);
                const month = monthIndex % 12;
                const bucketStart = new Date(Date.UTC(year, month, 1));
                const nextMonth = new Date(Date.UTC(year, month + 1, 1));
                buckets.push({
                    key: `${year}-${String(month + 1).padStart(2, '0')}`,
                    start: bucketStart,
                    end: new Date(nextMonth.getTime() - 1),
                    label: `${year}-${String(month + 1).padStart(2, '0')}`,
                });
            }
        } else {
            const startDay = new Date(fromDate);
            startDay.setUTCHours(0, 0, 0, 0);

            let effectiveStart = startDay;
            if (appliedRange === '30d') {
                const monthStart = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), 1));
                effectiveStart = monthStart;
            }

            const startCandidate = effectiveStart < startDay ? startDay : effectiveStart;
            const rangeDays = Math.max(1, Math.floor((toDate.getTime() - startCandidate.getTime()) / DAY_MS) + 1);
            const desired = appliedRange === '30d' ? Math.min(30, rangeDays) : rangeDays;

            for (let i = 0; i < desired; i++) {
                const dayStart = new Date(startCandidate);
                dayStart.setUTCDate(startCandidate.getUTCDate() + i);
                if (dayStart > toDate) {
                    break;
                }
                const dayEnd = new Date(dayStart.getTime());
                dayEnd.setUTCHours(23, 59, 59, 999);
                const key = dayStart.toISOString().split('T')[0];
                buckets.push({ key, start: dayStart, end: dayEnd, label: key });
            }
            if (!buckets.length) {
                const key = fromDate.toISOString().split('T')[0];
                const fallbackStart = new Date(fromDate);
                fallbackStart.setUTCHours(0, 0, 0, 0);
                const fallbackEnd = new Date(fallbackStart.getTime());
                fallbackEnd.setUTCHours(23, 59, 59, 999);
                buckets.push({ key, start: fallbackStart, end: fallbackEnd, label: key });
            }
        }

        const aggregated = buckets.map((bucket) => ({
            bucket,
            totals: {
                originalOutput: 0,
                totalAreaM2: 0,
                a1: 0,
                a2: 0,
                cut: 0,
                waste1: 0,
                waste2: 0,
                scrap: 0,
                waste_moc: 0,
                waste_lo: 0,
                waste_truoc_mai: 0,
                waste_thanh_pham: 0,
            },
            count: 0,
        }));

        rawRecords.forEach((record) => {
            if (!record.date) {
                return;
            }
            const recordDate = new Date(`${record.date}T00:00:00.000Z`);
            const target = aggregated.find(
                (entry) => recordDate >= entry.bucket.start && recordDate <= entry.bucket.end,
            );
            if (!target) {
                return;
            }
            target.totals.originalOutput += Number(record.originalOutput) || 0;
            target.totals.totalAreaM2 += Number(record.totalAreaM2) || 0;
            target.totals.a1 += Number(record.a1) || 0;
            target.totals.a2 += Number(record.a2) || 0;
            target.totals.cut += Number(record.cut) || 0;
            target.totals.waste1 += Number(record.waste1) || 0;
            target.totals.waste2 += Number(record.waste2) || 0;
            target.totals.scrap += Number(record.scrap) || 0;
            target.totals.waste_moc += Number(record.waste_moc) || 0;
            target.totals.waste_lo += Number(record.waste_lo) || 0;
            target.totals.waste_truoc_mai += Number(record.waste_truoc_mai) || 0;
            target.totals.waste_thanh_pham += Number(record.waste_thanh_pham) || 0;
            target.count += 1;
        });

        return aggregated.map((entry) => {
            const divisor = entry.count || 1;
            const sampleRecord =
                entry.count === 1
                    ? rawRecords.find((record) => {
                        if (!record.date) {
                            return false;
                        }
                        const recordDate = new Date(`${record.date}T00:00:00.000Z`);
                        return recordDate >= entry.bucket.start && recordDate <= entry.bucket.end;
                    })
                    : undefined;

            return {
                key: entry.bucket.key,
                date: entry.bucket.label.length === 7 ? `${entry.bucket.label}-01` : entry.bucket.label,
                lineName: lineLabel,
                productType: sampleRecord?.productType ?? '...',
                originalOutput: entry.totals.originalOutput,
                totalAreaM2: entry.totals.totalAreaM2,
                a1: entry.totals.a1,
                a2: entry.totals.a2,
                cut: entry.totals.cut,
                waste1: entry.totals.waste1,
                waste2: entry.totals.waste2,
                scrap: entry.totals.scrap,
                waste_moc: entry.totals.waste_moc / divisor,
                waste_lo: entry.totals.waste_lo / divisor,
                waste_truoc_mai: entry.totals.waste_truoc_mai / divisor,
                waste_thanh_pham: entry.totals.waste_thanh_pham / divisor,
            };
        });
    }
}
