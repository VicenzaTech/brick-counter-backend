// src/production-stage-history/dto/create-production-stage-history.dto.ts
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { StopReason } from '../entities/production-stage-history.entity';

export class CreateProductionStageHistoryDto {
  @IsInt()
  stageId: number;

  @IsOptional()
  @IsInt()
  productId?: number;

  @IsDateString()
  startTime: Date;

  @IsOptional()
  @IsDateString()
  endTime?: Date;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  area?: number;

  @IsOptional()
  @IsEnum(StopReason)
  stopReason?: StopReason;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  createdByUsername?: string;
}
