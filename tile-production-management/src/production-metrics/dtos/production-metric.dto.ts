export class CreateProductionMetricDto {
  timestamp: Date;
  shift?: string;
  sl_ep: number;
  sl_truoc_lo: number;
  sl_sau_lo: number;
  sl_truoc_mai: number;
  sl_sau_mai_canh: number;
  sl_truoc_dong_hop: number;
  productionLineId: number;
  brickTypeId?: number;
}

export class UpdateProductionMetricDto {
  timestamp?: Date;
  shift?: string;
  sl_ep?: number;
  sl_truoc_lo?: number;
  sl_sau_lo?: number;
  sl_truoc_mai?: number;
  sl_sau_mai_canh?: number;
  sl_truoc_dong_hop?: number;
  productionLineId?: number;
  brickTypeId?: number;
}

export class ProductionMetricResponseDto {
  id: number;
  timestamp: Date;
  shift: string;
  
  // Sensor data
  sl_ep: number;
  sl_truoc_lo: number;
  sl_sau_lo: number;
  sl_truoc_mai: number;
  sl_sau_mai_canh: number;
  sl_truoc_dong_hop: number;
  
  // Waste calculations
  hp_moc: number;
  ty_le_hp_moc: number;
  hp_lo: number;
  ty_le_hp_lo: number;
  hp_tm: number;
  ty_le_hp_tm: number;
  hp_ht: number;
  ty_le_hp_ht: number;
  tong_hao_phi: number;
  ty_le_tong_hao_phi: number;
  
  // Efficiency
  hieu_suat_moc: number;
  hieu_suat_lo: number;
  hieu_suat_truoc_mai: number;
  hieu_suat_thanh_pham: number;
  
  // Alerts
  canh_bao_hp_moc: boolean;
  canh_bao_hp_lo: boolean;
  canh_bao_hp_tm: boolean;
  canh_bao_hp_ht: boolean;
  cong_doan_van_de: string[];
  xu_huong: string;
  
  productionLine?: any;
  brickType?: any;
}

export class MetricsAnalyticsDto {
  startDate: Date;
  endDate: Date;
  productionLineId?: number;
  brickTypeId?: number;
  shift?: string;
}

export class MetricsSummaryDto {
  // KPI chính
  ty_le_hao_phi_tong: number;
  hieu_suat_san_xuat: number;
  ty_le_dat_khoan: number;
  san_luong_thuc_te: number;
  san_luong_khoan: number;
  
  // Hao phí chi tiết
  hao_phi_moc: {
    value: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
  };
  hao_phi_lo: {
    value: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
  };
  hao_phi_truoc_mai: {
    value: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
  };
  hao_phi_hoan_thien: {
    value: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
  };
  
  // Xu hướng
  trend_data: Array<{
    timestamp: Date;
    ty_le_hao_phi: number;
    hieu_suat: number;
  }>;
  
  // Cảnh báo
  alerts: string[];
  
  // So sánh ca
  shift_comparison: Array<{
    shift: string;
    san_luong: number;
    hieu_suat: number;
    ty_le_hao_phi: number;
  }>;
}

export class SankeyDataDto {
  nodes: Array<{
    name: string;
  }>;
  links: Array<{
    source: number;
    target: number;
    value: number;
  }>;
}
