# 📊 Production Tracking System - Hệ thống Theo dõi Sản xuất

## Tổng quan

Hệ thống tracking data 3 tầng để lưu trữ và phân tích dữ liệu sản xuất từ cảm biến MQTT:

### 🏗️ Kiến trúc 3 Tầng

```
┌─────────────────────────────────────────────────────────┐
│                  TẦNG 3: REAL-TIME STATE                │
│              device_telemetry (Latest Only)              │
│                 → WebSocket → Dashboard                  │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│              TẦNG 2: SHIFT/DAILY SUMMARIES               │
│   • production_shift_summaries (Chốt ca: 6h, 18h)       │
│   • production_daily_summaries (Chốt ngày: 6h sáng)     │
│                → Báo cáo, KPI, So sánh                   │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│              TẦNG 1: RAW TELEMETRY LOGS                  │
│    device_telemetry_logs (Tất cả MQTT messages)         │
│           → Audit trail, Analytics, Debug                │
└─────────────────────────────────────────────────────────┘
```

## 📋 Cấu trúc Database

### 1. **device_telemetry_logs** - Raw Logs (Tầng 1)
Lưu **TẤT CẢ** messages từ MQTT broker.

**Mục đích:**
- Audit trail: Truy vết đầy đủ lịch sử
- Data analytics: Phân tích xu hướng, pattern
- Debugging: Tìm lỗi, kiểm tra data quality
- Compliance: Đáp ứng yêu cầu lưu trữ

**Thông tin lưu trữ:**
- Metrics: count, errCount, rssi
- Health: status, battery, temperature, uptime
- Shift classification: shiftDate, shiftType, shiftNumber
- Delta calculation: deltaCount, deltaErrCount, timeSinceLast
- Raw data: rawPayload (JSONB)

**Indexes:**
```sql
- (deviceId, recordedAt)
- (deviceId, shiftDate, shiftType)
- (positionId, recordedAt)
- (recordedAt)
```

### 2. **production_shift_summaries** - Chốt Ca (Tầng 2)

**Quy định ca:**
- **Ca ngày (day)**: 06:00 - 18:00 (12 giờ)
- **Ca đêm (night)**: 18:00 - 06:00 hôm sau (12 giờ)

**Thông tin tổng hợp:**
- Production: startCount, endCount, totalCount (sản lượng)
- Errors: startErrCount, endErrCount, totalErrCount, errorRate
- Quality: avgRssi, minRssi, maxRssi
- Health: avgBattery, avgTemperature, avgUptime
- Performance: avgProductionRate (sản phẩm/giờ), downtimeMinutes
- Target: targetCount, achievementRate (% hoàn thành)

**Auto-generated:**
- Cron job chạy vào **6h và 18h** mỗi ngày
- Tự động chốt ca vừa kết thúc

**Manual trigger:**
```typescript
productionSummaryService.manualCloseShift(deviceId, shiftDate, shiftType, userId);
```

### 3. **production_daily_summaries** - Chốt Ngày (Tầng 2)

**Thông tin tổng hợp:**
- Breakdown: dayShiftCount, nightShiftCount, totalCount
- Errors: dayShiftErrCount, nightShiftErrCount, totalErrCount
- Comparison: deltaFromPreviousDay, changeRateFromPreviousDay
- Date info: year, month, day, dayOfWeek, weekOfYear

**Auto-generated:**
- Cron job chạy vào **6h sáng** mỗi ngày
- Tự động chốt ngày hôm trước

**Manual trigger:**
```typescript
productionSummaryService.manualCloseDay(deviceId, summaryDate, userId);
```

## 🚀 Cài đặt

### Bước 1: Cài đặt dependencies
```bash
cd brick-counter-backend/tile-production-management
npm install @nestjs/schedule
```

### Bước 2: Database Migration
```bash
# Tự động tạo tables (synchronize: true trong dev mode)
npm run start:dev

# Hoặc tạo migration thủ công
npm run migration:generate -- -n AddProductionTracking
npm run migration:run
```

### Bước 3: Seed initial data
```bash
# Seed devices (nếu chưa có)
node scripts/seed-devices-px01-dc01.js
```

### Bước 4: Kiểm tra logs
```bash
# Xem logs backend
docker logs tile-production-backend --tail 100 -f

# Kiểm tra telemetry logging
# Bạn sẽ thấy: "📝 Telemetry log saved for {deviceId}"
```

## 📊 Sử dụng

### 1. Real-time Monitoring (Tầng 3)
```typescript
// WebSocket client tự động nhận updates
socket.on('device_update', (data) => {
  console.log(data.count, data.errCount, data.rssi);
});
```

### 2. Shift Summary (Tầng 2)
```typescript
// Auto: Cron job tự động chạy vào 6h và 18h
// Hoặc manual:
const summary = await productionSummaryService.manualCloseShift(
  'SAU-ME-01',
  '2025-11-15',
  'day',
  'user@example.com'
);

console.log({
  totalCount: summary.totalCount,
  errorRate: summary.errorRate,
  avgProductionRate: summary.avgProductionRate,
  achievementRate: summary.achievementRate,
});
```

### 3. Daily Summary (Tầng 2)
```typescript
// Auto: Cron job tự động chạy vào 6h sáng
// Hoặc manual:
const summary = await productionSummaryService.manualCloseDay(
  'SAU-ME-01',
  '2025-11-15',
  'user@example.com'
);

console.log({
  dayShiftCount: summary.dayShiftCount,
  nightShiftCount: summary.nightShiftCount,
  totalCount: summary.totalCount,
  deltaFromPreviousDay: summary.deltaFromPreviousDay,
});
```

### 4. Raw Logs Analysis (Tầng 1)
```typescript
// Lấy logs theo shift
const logs = await telemetryLoggingService.getLogsByShift(
  'SAU-ME-01',
  '2025-11-15',
  'day'
);

// Phân tích delta changes
logs.forEach(log => {
  console.log({
    timestamp: log.recordedAt,
    count: log.count,
    deltaCount: log.deltaCount,
    timeSinceLast: log.timeSinceLast,
  });
});
```

## ⏰ Cron Jobs Schedule

```
06:00 - Chốt ca đêm + Chốt ngày hôm trước
18:00 - Chốt ca ngày
```

**Lưu ý:** Cron jobs chỉ chạy khi app đang running. Nếu restart app, jobs sẽ tự động tiếp tục theo schedule.

## 📈 Báo cáo & Phân tích

### Báo cáo theo ca
```sql
SELECT 
  shiftDate,
  shiftType,
  totalCount,
  errorRate,
  avgProductionRate,
  achievementRate
FROM production_shift_summaries
WHERE deviceId = 'SAU-ME-01'
ORDER BY shiftDate DESC, shiftType;
```

### So sánh hiệu suất theo ngày
```sql
SELECT 
  summaryDate,
  totalCount,
  dayShiftCount,
  nightShiftCount,
  deltaFromPreviousDay,
  changeRateFromPreviousDay
FROM production_daily_summaries
WHERE deviceId = 'SAU-ME-01'
ORDER BY summaryDate DESC;
```

### Top thiết bị theo sản lượng
```sql
SELECT 
  deviceId,
  SUM(totalCount) as total_production,
  AVG(errorRate) as avg_error_rate,
  AVG(avgProductionRate) as avg_rate
FROM production_shift_summaries
WHERE shiftDate >= '2025-11-01'
GROUP BY deviceId
ORDER BY total_production DESC;
```

## 🔧 Maintenance

### Data Retention
```typescript
// Xóa logs cũ hơn 90 ngày
await telemetryLoggingService.cleanupOldLogs(90);
```

### Rebuild Summaries
```typescript
// Nếu cần tính lại summary
const devices = await deviceRepository.find();

for (const device of devices) {
  await productionSummaryService.closeShift(
    device.deviceId,
    '2025-11-15',
    'day'
  );
}
```

## 🎯 Use Cases

### 1. Dashboard Real-time
- Hiển thị số lượng hiện tại: `device_telemetry`
- WebSocket updates tức thì

### 2. Báo cáo ca sản xuất
- Sản lượng theo ca: `production_shift_summaries`
- So sánh ca ngày vs ca đêm
- Tỷ lệ lỗi, hiệu suất

### 3. Báo cáo theo ngày/tuần/tháng
- Tổng hợp ngày: `production_daily_summaries`
- Aggregate theo weekOfYear, month
- Trend analysis

### 4. Audit & Compliance
- Truy vết lịch sử: `device_telemetry_logs`
- Xem chi tiết từng message
- Export raw data

### 5. Troubleshooting
- Tìm lỗi trong logs
- Phân tích downtime
- Kiểm tra message gaps

## 🏷️ Tags & Categories

**Shift Classification:**
- `shiftDate`: Ngày của ca (YYYY-MM-DD)
- `shiftType`: 'day' hoặc 'night'
- `shiftNumber`: Số thứ tự ca trong năm (1-730)

**Status:**
- `pending`: Chưa chốt
- `partial`: Đang chốt
- `completed`: Đã chốt
- `verified`: Đã xác nhận

## 📝 Notes

1. **Timezone:** Mặc định UTC, cần convert sang GMT+7 cho Vietnam
2. **Data Retention:** Nên có policy xóa logs cũ (recommend: 90-180 ngày)
3. **Performance:** Index được tối ưu cho queries thường dùng
4. **Backup:** Nên backup daily summaries định kỳ

## 🔗 Related Documentation

- [MQTT Integration](./MQTT_LOGGING.md)
- [WebSocket Guide](./MQTT_WEBSOCKET_INTEGRATION.md)
- [System Architecture](../../../SYSTEM_ARCHITECTURE.md)
