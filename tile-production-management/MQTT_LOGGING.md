# MQTT Logging & Testing Guide

## 📊 Logging đã được cải thiện

Backend hiện tại đã được cập nhật với logging chi tiết cho tất cả dữ liệu MQTT:

### Logs sẽ hiển thị:

#### 1. **Telemetry Messages** (Dữ liệu đếm gạch)
```
╔════════════════════════════════════════════════════════════
║ 📊 TELEMETRY MESSAGE RECEIVED
║ Device ID: device_001
║ Timestamp: 2025-11-14T10:30:45.123Z
║ Raw Message: {
║   "deviceId": "device_001",
║   "ts": "2025-11-14T10:30:45.123Z",
║   "metrics": {
║     "count": 1234,
║     "err_count": 5
║   },
║   "quality": {
║     "rssi": -65
║   }
║ }
╚════════════════════════════════════════════════════════════
📈 Parsed Metrics:
   - Count: 1234 (type: number)
   - Error Count: 5 (type: number)
   - RSSI: -65 dBm (type: number)
✅ Data cached for device_001
💾 Cache entry: count=1234, err_count=5, rssi=-65
📡 Broadcasting to WebSocket clients...
   Broadcast data: {"count":1234,"errCount":5,"rssi":-65,"timestamp":"2025-11-14T10:30:45.123Z"}
✅ Broadcast completed
─────────────────────────────────────────────────────────────
```

#### 2. **Health Messages** (Trạng thái thiết bị)
```
╔════════════════════════════════════════════════════════════
║ 🏥 HEALTH MESSAGE RECEIVED
║ Device ID: device_001
║ Timestamp: 2025-11-14T10:30:45.123Z
║ Raw Message: {
║   "deviceId": "device_001",
║   "status": "online",
║   "battery": 85,
║   "temperature": 35
║ }
╚════════════════════════════════════════════════════════════
🔋 Parsed Health Data:
   - Status: online
   - Battery: 85%
📋 Additional Fields:
   - temperature: 35
✅ Health data cached for device_001
📡 Broadcasting health update to WebSocket clients...
✅ Health broadcast completed
─────────────────────────────────────────────────────────────
```

## 🧪 Test MQTT Data

### Cách 1: Sử dụng API endpoints

#### 1. Kiểm tra kết nối MQTT:
```bash
curl http://localhost:5555/api/mqtt/status
```

#### 2. Gửi 1 test message:
```bash
curl -X POST http://localhost:5555/api/mqtt/test \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device_001"
  }'
```

#### 3. Gửi nhiều test messages liên tục:
```bash
curl -X POST http://localhost:5555/api/mqtt/test/continuous \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device_001",
    "count": 20,
    "interval": 1000
  }'
```

#### 4. Xem dữ liệu đã cache:
```bash
# Xem data của 1 device
curl http://localhost:5555/api/devices/device_001/mqtt-data

# Xem data của tất cả devices
curl http://localhost:5555/api/devices/mqtt/all-data
```

#### 5. Clear cache:
```bash
curl -X POST http://localhost:5555/api/devices/mqtt/clear-cache
```

### Cách 2: Sử dụng Python script

#### Cài đặt dependencies:
```bash
pip install paho-mqtt
```

#### Chạy test publisher:
```bash
python test-mqtt-publisher.py
```

Script này sẽ:
- Kết nối đến MQTT broker tại `192.168.221.4:1883`
- Gửi telemetry messages liên tục cho 3 devices
- Gửi health messages mỗi 5 iterations
- Hiển thị log chi tiết về từng message được gửi

## 📡 MQTT Topics được subscribe:

Backend đang lắng nghe các topics sau:
- `devices/+/telemetry` - Dữ liệu đếm gạch
- `devices/+/event` - Sự kiện
- `devices/+/health` - Trạng thái thiết bị
- `devices/+/state` - Trạng thái
- `devices/+/resp` - Response
- `devices/+/status` - Status
- `broadcast/+/resp` - Broadcast response
- `broadcast/+/confirm` - Broadcast confirm

## 🔍 Xem logs trong terminal:

Khi backend đang chạy, bạn sẽ thấy:

1. **Khi MQTT kết nối:**
```
🔌 Đang kết nối đến MQTT broker: mqtt://192.168.221.4:1883
✅ Kết nối MQTT thành công!
✅ Đã subscribe topic: devices/+/telemetry
✅ Đã subscribe topic: devices/+/health
📋 Telemetry handlers: 1
📋 Health handlers: 1
```

2. **Khi nhận message:**
```
📨 Received MQTT message on topic: devices/device_001/telemetry
🔄 Dispatching telemetry for device: device_001 to 1 handlers
```

3. **Khi broadcast lên WebSocket:**
```
📱 Broadcasting device update for: device_001 to 2 clients
```

## 🎯 Format dữ liệu MQTT

### Telemetry Message:
```json
{
  "deviceId": "device_001",
  "ts": "2025-11-14T10:30:45.123Z",
  "metrics": {
    "count": 1234,
    "err_count": 5
  },
  "quality": {
    "rssi": -65
  }
}
```

### Health Message:
```json
{
  "deviceId": "device_001",
  "ts": "2025-11-14T10:30:45.123Z",
  "status": "online",
  "battery": 85,
  "temperature": 35,
  "uptime": 3600
}
```

## 🌐 WebSocket Events

Frontend có thể subscribe vào room `devices` để nhận real-time updates:

```javascript
socket.on('device_update', (data) => {
  console.log('Device update:', data);
  // data = {
  //   deviceId: 'device_001',
  //   count: 1234,
  //   errCount: 5,
  //   rssi: -65,
  //   timestamp: '2025-11-14T10:30:45.123Z'
  // }
});
```

## 🐛 Troubleshooting

### Không nhận được dữ liệu:

1. **Kiểm tra MQTT connection:**
   ```bash
   curl http://localhost:5555/api/mqtt/status
   ```

2. **Kiểm tra logs backend** - tìm:
   - ✅ Kết nối MQTT thành công
   - ✅ Đã subscribe topic
   - 📨 Received MQTT message

3. **Test gửi message:**
   ```bash
   curl -X POST http://localhost:5555/api/mqtt/test
   ```

4. **Kiểm tra MQTT broker có chạy không:**
   ```bash
   telnet 192.168.221.4 1883
   ```

### Không thấy logs chi tiết:

Đảm bảo log level trong NestJS cho phép DEBUG:
- Logs với emoji (📊, 🏥, ✅) luôn hiển thị
- Debug logs cần set `LOG_LEVEL=debug` trong `.env`
