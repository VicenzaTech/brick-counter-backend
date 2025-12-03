import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryProductionLineRunDto {
    @IsOptional()
    @IsInt()
    productionLineId?: number;

    @IsOptional()
    @IsInt()
    brickTypeId?: number;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;

    @IsOptional()
    @Type(() => Number)
    @Min(0)
    offset?: number = 0;

    @IsOptional()
    @Type(() => Number)
    @Min(1)
    @Max(200)
    limit?: number = 50;
}
