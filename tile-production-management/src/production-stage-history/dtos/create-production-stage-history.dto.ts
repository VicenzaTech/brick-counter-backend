// src/production-stage-history/dto/create-production-stage-history.dto.ts
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, IsEnum, IsBoolean, IsNotEmpty } from 'class-validator';
import { StopReason } from '../entities/production-stage-history.entity';

export class CreateProductionStageHistoryDto {
    @IsNumber()
    stageId: number;

    @IsOptional()
    @IsInt()
    productId?: number;

    @IsNotEmpty()
    @IsNumber()
    productionLineId: number;

    @IsOptional()
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
