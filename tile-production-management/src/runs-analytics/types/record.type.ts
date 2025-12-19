export type ProductionRecord = {
  key: string;               // duy nhất, thường gộp date + line
  date: string;              // YYYY-MM-DD
  lineName: string;          // tên dây chuyền
  productType: string;       // loại sản phẩm
  originalOutput: number;    // sản lượng đầu vào (m³)
  totalAreaM2: number;       // diện tích quy đổi (m²)
  a1: number;                // sản phẩm loại A1
  a2: number;
  cut: number;
  waste1: number;
  waste2: number;
  scrap: number;
  waste_moc: number;         // % hao phí từng công đoạn
  waste_lo: number;
  waste_truoc_mai: number;
  waste_thanh_pham: number;
};
