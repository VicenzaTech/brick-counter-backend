import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class ProductionLineRunStatsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    productionLineId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    brickTypeId?: number;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}

