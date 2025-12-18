import { IsArray, IsDateString, IsEnum, IsOptional, ArrayMaxSize, ArrayMinSize } from 'class-validator';

export class GetStatisticsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  endDate?: string; // YYYY-MM-DD
}

export class GetTrendDto {
  @IsOptional()
  @IsDateString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  endDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';
}

export class CompareBrickTypesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  brickTypeIds: number[];

  @IsOptional()
  @IsDateString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  endDate?: string; // YYYY-MM-DD
}
