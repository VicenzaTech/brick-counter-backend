import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateWorkshopTargetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsPositive()
  workshopId: number;

  @IsInt()
  @Min(2000)
  @Max(2500)
  year: number;

  @IsNumber()
  @Min(0)
  yearlyTarget: number;

  @IsOptional()
  @IsString()
  description?: string;

}

export class UpdateWorkshopTargetDto extends PartialType(CreateWorkshopTargetDto) {}

export class WorkshopTargetQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workshopId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  includeHistory?: boolean;
}
