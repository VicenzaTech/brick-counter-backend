export class CreateQuotaTargetDto {
  name: string;
  monthly_target: number;
  daily_target?: number;
  product_size?: string;
  threshold_hp_moc?: number;
  threshold_hp_lo?: number;
  threshold_hp_tm?: number;
  threshold_hp_ht?: number;
  target_efficiency?: number;
  description?: string;
  brickTypeId?: number;
}

export class UpdateQuotaTargetDto {
  name?: string;
  monthly_target?: number;
  daily_target?: number;
  product_size?: string;
  threshold_hp_moc?: number;
  threshold_hp_lo?: number;
  threshold_hp_tm?: number;
  threshold_hp_ht?: number;
  target_efficiency?: number;
  description?: string;
  is_active?: boolean;
  brickTypeId?: number;
}

export class QuotaComparisonDto {
  productionLineId: number;
  brickTypeId?: number;
  startDate: Date;
  endDate: Date;
}

export class QuotaComparisonResultDto {
  san_luong_khoan: number;
  san_luong_thuc_te: number;
  chenh_lech: number;
  ty_le_vuot_khoan: number;
  quota_target: any;
  performance_status: 'below' | 'meeting' | 'exceeding';
}
