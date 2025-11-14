# Production Metrics & Analytics System

## Tổng quan

Hệ thống theo dõi và phân tích chi tiết các chỉ số sản xuất, hao phí, và hiệu suất cho các dây chuyền sản xuất gạch (Dây chuyền 1, 2, và 6).

## Cấu trúc Database

### 1. Production Metrics (production_metrics)

Lưu trữ dữ liệu từ cảm biến và các chỉ số tính toán.

**Các trường dữ liệu cảm biến:**
- `sl_ep` - Sản lượng sau máy ép (SAU-ME-01 + SAU-ME-02)
- `sl_truoc_lo` - Sản lượng trước lò nung (TRUOC-LN-01 + TRUOC-LN-02)
- `sl_sau_lo` - Sản lượng sau lò nung (SAU-LN-01)
- `sl_truoc_mai` - Sản lượng trước mài mặt (TRUOC-MM-01)
- `sl_sau_mai_canh` - Sản lượng sau mài cạnh (SAU-MC-01)
- `sl_truoc_dong_hop` - Sản lượng trước đóng hộp (TRUOC-DH-01)

**Các chỉ số hao phí (tự động tính):**
- `hp_moc` - Hao phí mộc = SL_Ep - SL_TruocLo
- `ty_le_hp_moc` - Tỷ lệ % hao phí mộc
- `hp_lo` - Hao phí lò = SL_TruocLo - SL_SauLo
- `ty_le_hp_lo` - Tỷ lệ % hao phí lò
- `hp_tm` - Hao phí trước mài = SL_SauLo - SL_TruocMai
- `ty_le_hp_tm` - Tỷ lệ % hao phí trước mài
- `hp_ht` - Hao phí hoàn thiện = SL_TruocMai - SL_TruocDongHop
- `ty_le_hp_ht` - Tỷ lệ % hao phí hoàn thiện
- `tong_hao_phi` - Tổng hao phí
- `ty_le_tong_hao_phi` - Tỷ lệ % tổng hao phí

**Các chỉ số hiệu suất (tự động tính):**
- `hieu_suat_moc` - Hiệu suất mộc = (SL_TruocLo / SL_Ep) × 100%
- `hieu_suat_lo` - Hiệu suất lò = (SL_SauLo / SL_Ep) × 100%
- `hieu_suat_truoc_mai` - Hiệu suất trước mài = (SL_TruocMai / SL_Ep) × 100%
- `hieu_suat_thanh_pham` - Hiệu suất thành phẩm = (SL_TruocDongHop / SL_Ep) × 100%

**Cảnh báo:**
- `canh_bao_hp_moc` - Cảnh báo khi > 2%
- `canh_bao_hp_lo` - Cảnh báo khi > 3%
- `canh_bao_hp_tm` - Cảnh báo khi > 2%
- `canh_bao_hp_ht` - Cảnh báo khi > 2%
- `cong_doan_van_de` - Danh sách công đoạn có vấn đề
- `xu_huong` - Xu hướng: 'tang', 'giam', 'on-dinh'

**Quan hệ:**
- `productionLine` - Thuộc dây chuyền nào (1, 2, 6)
- `brickType` - Loại gạch đang sản xuất (300x600mm, 400x800mm, v.v.)

### 2. Quota Targets (quota_targets)

Lưu trữ mức khoán sản xuất theo sản phẩm.

**Các trường chính:**
- `name` - Tên mức khoán
- `monthly_target` - Sản lượng khoán tháng (m²)
- `daily_target` - Sản lượng khoán ngày (m²)
- `product_size` - Kích thước sản phẩm (300x600mm, 400x800mm, v.v.)
- `threshold_hp_moc` - Ngưỡng hao phí mộc (mặc định 2%)
- `threshold_hp_lo` - Ngưỡng hao phí lò (mặc định 3%)
- `threshold_hp_tm` - Ngưỡng hao phí trước mài (mặc định 2%)
- `threshold_hp_ht` - Ngưỡng hao phí hoàn thiện (mặc định 2%)
- `target_efficiency` - Hiệu suất mục tiêu (%)
- `is_active` - Khoán có đang hoạt động không

## API Endpoints

### Production Metrics

**POST /production-metrics**
Tạo bản ghi mới từ dữ liệu cảm biến (tự động tính toán các chỉ số)
```json
{
  "timestamp": "2025-11-14T10:00:00Z",
  "shift": "A",
  "sl_ep": 10000,
  "sl_truoc_lo": 9800,
  "sl_sau_lo": 9500,
  "sl_truoc_mai": 9300,
  "sl_sau_mai_canh": 9200,
  "sl_truoc_dong_hop": 9000,
  "productionLineId": 1,
  "brickTypeId": 1
}
```

**GET /production-metrics**
Lấy danh sách metrics với filter
```
Query params:
- startDate
- endDate
- productionLineId
- brickTypeId
- shift
```

**GET /production-metrics/summary**
Lấy tổng hợp phân tích (KPI, hao phí, xu hướng, so sánh ca)

**GET /production-metrics/sankey**
Lấy dữ liệu cho biểu đồ Sankey (dòng chảy sản xuất)

**GET /production-metrics/:id**
Lấy chi tiết 1 metric

**PUT /production-metrics/:id**
Cập nhật metric

**DELETE /production-metrics/:id**
Xóa metric

### Quota Targets

**POST /quota-targets**
Tạo mức khoán mới

**GET /quota-targets**
Lấy tất cả mức khoán

**GET /quota-targets/active**
Lấy các mức khoán đang hoạt động

**GET /quota-targets/brick-type/:brickTypeId**
Lấy mức khoán theo loại gạch

**POST /quota-targets/compare**
So sánh sản lượng thực tế với khoán
```json
{
  "productionLineId": 1,
  "brickTypeId": 1,
  "startDate": "2025-11-01",
  "endDate": "2025-11-30"
}
```

**GET /quota-targets/:id**
Lấy chi tiết mức khoán

**PUT /quota-targets/:id**
Cập nhật mức khoán

**DELETE /quota-targets/:id**
Xóa mức khoán

## Frontend - Analytics Dashboard

### URL: /analytics

Dashboard phân tích toàn diện với các tính năng:

**1. Bộ lọc (Filters)**
- Chọn dây chuyền (1, 2, 6)
- Chọn ca làm việc (A, B, C hoặc tất cả)
- Chọn khoảng thời gian (từ ngày - đến ngày)
- Chọn loại gạch (tùy chọn)

**2. KPI Cards**
- Tỷ lệ hao phí tổng (%)
- Hiệu suất sản xuất (%)
- Tỷ lệ đạt khoán (%)
- Sản lượng thực tế vs khoán

**3. Chi tiết hao phí theo công đoạn**
4 cards hiển thị:
- Hao phí mộc (HP_Mộc)
- Hao phí lò (HP_Lò)
- Hao phí trước mài (HP_TM)
- Hao phí hoàn thiện (HP_HT)

Mỗi card hiển thị:
- Giá trị số lượng
- Tỷ lệ phần trăm
- Ngưỡng cho phép
- Trạng thái: Xanh (tốt), Vàng (cảnh báo), Đỏ (vượt ngưỡng)
- Progress bar
- Mô tả công đoạn

**4. Cảnh báo**
Hiển thị danh sách các công đoạn vượt ngưỡng

**5. Biểu đồ dòng chảy sản xuất (Sankey Diagram)**
Hiển thị luồng gạch qua các công đoạn:
- Máy ép → Trước lò → Sau lò → Trước mài → Đóng hộp
- Các hao phí tại mỗi công đoạn

**6. So sánh theo ca**
Bảng so sánh hiệu suất các ca làm việc:
- Sản lượng
- Hiệu suất
- Tỷ lệ hao phí

**7. Xu hướng theo thời gian**
Biểu đồ line chart hiển thị xu hướng hao phí và hiệu suất

## Công thức tính toán

### Hao phí
```
HP_Mộc = SL_Ep - SL_TruocLo
TyLe_HP_Mộc = (HP_Mộc / SL_Ep) × 100%

HP_Lò = SL_TruocLo - SL_SauLo
TyLe_HP_Lò = (HP_Lò / SL_Ep) × 100%

HP_TM = SL_SauLo - SL_TruocMai
TyLe_HP_TM = (HP_TM / SL_Ep) × 100%

HP_HT = SL_TruocMai - SL_TruocDongHop
TyLe_HP_HT = (HP_HT / SL_Ep) × 100%

TongHaoPhi = HP_Mộc + HP_Lò + HP_TM + HP_HT
TyLe_TongHaoPhi = (TongHaoPhi / SL_Ep) × 100%
```

### Hiệu suất
```
HieuSuat_Mộc = (SL_TruocLo / SL_Ep) × 100%
HieuSuat_Lò = (SL_SauLo / SL_Ep) × 100%
HieuSuat_TruocMai = (SL_TruocMai / SL_Ep) × 100%
HieuSuat_ThanhPham = (SL_TruocDongHop / SL_Ep) × 100%
```

### So sánh khoán
```
ChenLech = SanLuongThucTe - SanLuongKhoan
TyLe_VuotKhoan = (ChenLech / SanLuongKhoan) × 100%
```

## Ngưỡng cảnh báo

- **Hao phí mộc**: > 2%
- **Hao phí lò**: > 3%
- **Hao phí trước mài**: > 2%
- **Hao phí hoàn thiện**: > 2%

## Trạng thái hiển thị

### Màu sắc
- **Xanh (Good)**: Trong ngưỡng cho phép (< 80% ngưỡng)
- **Vàng (Warning)**: Gần ngưỡng (80-100% ngưỡng)
- **Đỏ (Danger)**: Vượt ngưỡng (> 100% ngưỡng)

## Ví dụ sử dụng

### 1. Tạo mức khoán cho sản phẩm 300x600mm
```bash
curl -X POST http://localhost:3001/quota-targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Khoán 300x600mm - Tháng 11/2025",
    "monthly_target": 273300,
    "daily_target": 9110,
    "product_size": "300x600mm",
    "threshold_hp_moc": 2,
    "threshold_hp_lo": 3,
    "threshold_hp_tm": 2,
    "threshold_hp_ht": 2,
    "target_efficiency": 91,
    "brickTypeId": 1
  }'
```

### 2. Ghi nhận dữ liệu sản xuất
```bash
curl -X POST http://localhost:3001/production-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-14T08:00:00Z",
    "shift": "A",
    "sl_ep": 10000,
    "sl_truoc_lo": 9850,
    "sl_sau_lo": 9600,
    "sl_truoc_mai": 9450,
    "sl_sau_mai_canh": 9350,
    "sl_truoc_dong_hop": 9200,
    "productionLineId": 1,
    "brickTypeId": 1
  }'
```

### 3. Lấy phân tích tổng hợp
```bash
curl "http://localhost:3001/production-metrics/summary?startDate=2025-11-01&endDate=2025-11-14&productionLineId=1&shift=A"
```

### 4. So sánh với khoán
```bash
curl -X POST http://localhost:3001/quota-targets/compare \
  -H "Content-Type: application/json" \
  -d '{
    "productionLineId": 1,
    "brickTypeId": 1,
    "startDate": "2025-11-01",
    "endDate": "2025-11-30"
  }'
```

## Tích hợp với MQTT

Dữ liệu từ cảm biến có thể được gửi qua MQTT và tự động tạo production metrics:

```javascript
// Trong devices-mqtt.handler.ts
async handleDeviceData(topic: string, message: any) {
  // Parse sensor data
  const sensorData = {
    sl_ep: message.SAU_ME_01 + message.SAU_ME_02,
    sl_truoc_lo: message.TRUOC_LN_01 + message.TRUOC_LN_02,
    sl_sau_lo: message.SAU_LN_01,
    sl_truoc_mai: message.TRUOC_MM_01,
    sl_sau_mai_canh: message.SAU_MC_01,
    sl_truoc_dong_hop: message.TRUOC_DH_01,
    timestamp: new Date(),
    productionLineId: getLineFromTopic(topic),
  };
  
  // Create metric
  await this.metricsService.create(sensorData);
}
```

## Ghi chú

- Tất cả các phép tính được thực hiện tự động trong backend
- Frontend chỉ cần gọi API và hiển thị kết quả
- Hỗ trợ theo dõi real-time qua WebSocket (có thể mở rộng)
- Database tự động đồng bộ schema khi chạy ứng dụng (synchronize: true)
