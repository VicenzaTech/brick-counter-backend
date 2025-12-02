import { IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { StopReason } from 'src/production-stage-history/entities/production-stage-history.entity';

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

  @IsOptional()
  @IsEnum(StopReason)
  stopReason?: StopReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
