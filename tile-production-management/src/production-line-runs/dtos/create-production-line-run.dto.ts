import { IsDateString, IsInt, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductionLineRunDto {
    @IsInt()
    productionLineId: number;

    @IsOptional()
    @IsInt()
    brickTypeId?: number;

    @IsOptional()
    @IsDateString()
    startTime?: string;

    @IsOptional()
    @IsDateString()
    endTime?: string;

    @IsOptional()
    @IsInt()
    durationMinutes?: number;

    @IsOptional()
    @IsNumber()
    totalPieces?: number;

    @IsOptional()
    @IsNumber()
    totalAreaM2?: number;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    status?: string;

    @IsOptional()
    @IsString()
    @MaxLength(16)
    dataSource?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsInt()
    createdById?: number;

    @IsOptional()
    @IsInt()
    updatedById?: number;

    @IsOptional()
    @IsInt()
    pressStageHistoryId?: number;

    @IsOptional()
    @IsInt()
    bisqueStageHistoryId?: number;

    @IsOptional()
    @IsInt()
    glazeStageHistoryId?: number;

    @IsOptional()
    @IsInt()
    grindStageHistoryId?: number;

    @IsOptional()
    @IsInt()
    packagingStageHistoryId?: number;

    @IsOptional()
    @IsNumber()
    pressQuantity?: number;

    @IsOptional()
    @IsNumber()
    pressArea?: number;

    @IsOptional()
    @IsNumber()
    bisqueQuantity?: number;

    @IsOptional()
    @IsNumber()
    bisqueArea?: number;

    @IsOptional()
    @IsNumber()
    glazeQuantity?: number;

    @IsOptional()
    @IsNumber()
    glazeArea?: number;

    @IsOptional()
    @IsNumber()
    grindQuantity?: number;

    @IsOptional()
    @IsNumber()
    grindArea?: number;

    @IsOptional()
    @IsNumber()
    packagingQuantity?: number;

    @IsOptional()
    @IsNumber()
    packagingArea?: number;

    @IsOptional()
    @IsNumber()
    a1Pieces?: number;

    @IsOptional()
    @IsNumber()
    a2Pieces?: number;

    @IsOptional()
    @IsNumber()
    cutLoPieces?: number;

    @IsOptional()
    @IsNumber()
    phe1Pieces?: number;

    @IsOptional()
    @IsNumber()
    phe2Pieces?: number;

    @IsOptional()
    @IsNumber()
    pheHuyPieces?: number;
}
