import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateProductionStageDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  positionId?: number;

  @IsNumber()
  productionLineId: number;
}
