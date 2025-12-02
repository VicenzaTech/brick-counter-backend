import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateProductionStageStatusDto {
  @IsNumber()
  productionLineId: number;

  @IsString()
  stageName: string;

  @IsString()
  status: string;

  @IsNumber()
  @IsOptional()
  productId?: number;
}
