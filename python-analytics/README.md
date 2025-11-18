# Python Analytics Service

Service phân tích realtime từ device log files, tính toán các thông số như tốc độ sản xuất, hiệu suất, xu hướng.

## Tính năng

### 📊 Metrics tính toán

**Device Level:**
- Tốc độ sản xuất (viên/phút, viên/giờ)
- Tổng sản xuất (hôm nay, 1 giờ qua, 10 phút qua)
- Trạng thái (đang chạy / dừng)
- Thời gian chạy liên tục (uptime)
- Thời gian dừng (idle time)
- Xu hướng (tăng / giảm / ổn định / dừng)
- Hiệu suất so với target (nếu có)

**Production Line Level:**
- Tổng số thiết bị
- Số thiết bị đang chạy / dừng
- Tổng sản lượng
- Tốc độ trung bình

### 🔄 Publish qua Redis

Metrics được publish qua Redis channels để NestJS backend hoặc frontend có thể subscribe:

- `analytics:line:{line_name}` - Metrics của từng dây chuyền
- `analytics:aggregate` - Tổng hợp toàn hệ thống

Metrics cũng được lưu trong Redis với TTL 5 phút:
- `metrics:line:{line_name}`
- `metrics:aggregate`

## Cài đặt

```bash
cd python-analytics

# Tạo virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Cấu hình

Copy `.env.example` thành `.env` và chỉnh sửa:

```bash
cp .env.example .env
```

Các biến quan trọng:
- `LOG_DIR` - Thư mục chứa log files
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `CALCULATION_INTERVAL` - Tần suất tính toán (seconds)
- `HISTORY_WINDOW` - Cửa sổ thời gian phân tích (seconds)

## Chạy service

### Live Mode (khuyến nghị - theo dõi file realtime)

```bash
python analytics_service.py
```

Live mode sử dụng `watchdog` để monitor file changes:
- ✅ Chỉ đọc phần mới của file (tail mode)
- ✅ Tự động phát hiện khi có data mới
- ✅ Hiệu quả với file dài (không đọc lại toàn bộ)
- ✅ Latency thấp hơn

### Polling Mode (fallback)

```bash
python analytics_service.py --polling
```

Polling mode đọc toàn bộ file mỗi lần:
- Đơn giản hơn nhưng tốn I/O hơn
- Sử dụng khi live mode gặp vấn đề

## Cấu trúc log files

Service đọc log files theo cấu trúc:
```
logs/
  2025-11-18/
    DC-01/
      sau-me/
        sau-me-01.txt
      truoc-ln/
        truoc-ln-01.txt
```

Format mỗi dòng trong file:
```
[2025-11-18T13:42:13.000Z] Count: 2034
```

## Output Example

```json
{
  "productionLine": "DC-01",
  "totalDevices": 8,
  "runningDevices": 6,
  "stoppedDevices": 2,
  "totalProducedToday": 15678,
  "averageSpeedPerHour": 1234.56,
  "devices": [
    {
      "deviceId": "SAU-ME-01",
      "position": "sau-me",
      "currentCount": 2034,
      "speedPerMinute": 2.5,
      "speedPerHour": 150.0,
      "isRunning": true,
      "trend": "increasing",
      "uptimeSeconds": 3600.0,
      "idleTimeSeconds": 0.0
    }
  ]
}
```

## Tích hợp với NestJS

Trong NestJS backend, subscribe Redis channel để nhận metrics:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class AnalyticsSubscriber implements OnModuleInit {
  private subscriber: Redis;

  async onModuleInit() {
    this.subscriber = new Redis({
      host: 'localhost',
      port: 6379,
    });

    // Subscribe to analytics channels
    await this.subscriber.subscribe('analytics:aggregate');
    await this.subscriber.psubscribe('analytics:line:*');

    this.subscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);
      console.log(`Metrics from ${channel}:`, data);
      
      // Broadcast to WebSocket clients, save to DB, etc.
    });
  }
}
```

## Development

### Chạy với auto-reload

```bash
# Install watchdog
pip install watchdog[watchmedo]

# Run with auto-reload
watchmedo auto-restart -d . -p '*.py' -- python analytics_service.py
```

### Testing

```bash
# Test log parser
python -c "from log_parser import LogParser; from pathlib import Path; from datetime import datetime; p = LogParser(Path('../tile-production-management/logs')); print(p.find_device_logs(datetime.now()))"

# Test metrics calculation
python -c "from analytics_service import AnalyticsService; s = AnalyticsService(); metrics = s.calculate_all_metrics(); print(metrics)"
```

## Architecture

```
┌─────────────────┐
│  Device Logs    │  (File system)
│  *.txt files    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LogParser      │  Parse log files
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MetricsCalc     │  Calculate metrics
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redis Pub/Sub  │  Publish results
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  NestJS/Web     │  Consume metrics
│                 │
└─────────────────┘
```
