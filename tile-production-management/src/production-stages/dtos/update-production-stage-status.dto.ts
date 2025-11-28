import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateProductionStageStatusDto {
  @IsNumber()
  productionLineId: number;

  @IsString()
  stageName: string;

  @IsString()
  status: string;

  @IsDateString()
  @IsOptional()
  startTime?: Date;

  @IsNumber()
  @IsOptional()
  productId?: number;
}
