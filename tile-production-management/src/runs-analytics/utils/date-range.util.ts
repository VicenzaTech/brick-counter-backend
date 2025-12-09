export type AnalyticsRangePreset = '30d' | '12m';
export type AnalyticsAppliedRange = AnalyticsRangePreset | 'custom';

export interface AnalyticsDateRangeInput {
    from?: Date;
    to?: Date;
    range?: AnalyticsRangePreset;
}

export interface AnalyticsDateRangeResult {
    fromDate: Date;
    toDate: Date;
    appliedRange: AnalyticsAppliedRange;
}

export function resolveAnalyticsDateRange(input: AnalyticsDateRangeInput = {}): AnalyticsDateRangeResult {
    const now = input.to ? new Date(input.to) : new Date();
    const toDate = new Date(now.getTime());
    let appliedRange: AnalyticsAppliedRange = input.range ?? '30d';

    let fromDate: Date;
    if (input.from) {
        fromDate = new Date(input.from);
        if (!input.range) {
            appliedRange = 'custom';
        }
    } else {
        fromDate = new Date(toDate.getTime());
        if (appliedRange === '12m') {
            fromDate.setUTCMonth(fromDate.getUTCMonth() - 12);
        } else {
            fromDate.setUTCDate(fromDate.getUTCDate() - 30);
            appliedRange = '30d';
        }
    }

    if (input.to) {
        toDate.setTime(new Date(input.to).getTime());
        if (!input.range && !input.from) {
            appliedRange = 'custom';
        }
    }

    if (fromDate > toDate) {
        const temp = new Date(fromDate.getTime());
        fromDate = new Date(toDate.getTime());
        toDate.setTime(temp.getTime());
    }

    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    return {
        fromDate,
        toDate,
        appliedRange,
    };
}

export const ANALYTICS_RANGE_PRESETS: { key: AnalyticsRangePreset; label: string }[] = [
    { key: '30d', label: '30 ngày gần nhất' },
    { key: '12m', label: '12 tháng gần nhất' },
];
