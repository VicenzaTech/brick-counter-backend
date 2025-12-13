import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import type { AnalyticsRangePreset } from '../utils/date-range.util';

export class RunsAnalyticsQueryDto {
    @IsOptional()
    @IsString()
    productionLineId?: string;

    @IsOptional()
    @IsIn(['30d', '12m'])
    range?: AnalyticsRangePreset;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}
