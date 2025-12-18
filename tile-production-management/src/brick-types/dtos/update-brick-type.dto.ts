import { IsString, IsOptional, IsNumber, IsBoolean, IsIn, Min, Max } from 'class-validator';

export class UpdateBrickTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  specs?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  activeProductionLineId?: number;

  @IsOptional()
  @IsIn(['producing', 'paused', 'inactive'])
  activeStatus?: 'producing' | 'paused' | 'inactive';
  
  // CSV Standard Fields - Thong tin san pham
  @IsOptional()
  @IsString()
  nameEnglish?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(20)
  thickness?: number;

  @IsOptional()
  @IsString()
  @IsIn(['Granite', 'Porcelain', 'Ceramic', 'Semi-Porcelain', 'Granite/Porcelain', ''])
  brickType?: string;

  // CSV Standard Fields - Thong tin dong goi
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  weightPerM2?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  piecesPerBox?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5)
  m2PerBox?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  weightPerBox?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  boxesPerPallet?: number;

  // CSV Standard Fields - Tieu chuan
  @IsOptional()
  @IsString()
  qualityStandard?: string;

  @IsOptional()
  @IsString()
  productLineName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
