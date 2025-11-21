# Simple Universal MQTT & WebSocket

## 🎯 Giải pháp Đơn Giản Nhất

**1 handler duy nhất** xử lý **RAW DATA** cho **MỌI loại sensor**!

---

## 📐 Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MQTT BROKER                                    │
│                      (192.168.221.4:1883)                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  MQTT Topics (Pub/Sub)  │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
devices/BR/+/telemetry  devices/TEMP/+/telemetry  devices/HM/+/telemetry
devices/BR/+/status     devices/TEMP/+/status     devices/HM/+/status
devices/BR/+/cmd        devices/TEMP/+/cmd        devices/HM/+/cmd
clusters/BR/cmd         clusters/TEMP/cmd         clusters/HM/cmd
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NestJS Backend Application                           │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │           SimpleUniversalMqttService                            │   │
│  │  • Connect to MQTT broker                                       │   │
│  │  • Subscribe to all cluster topics: ['BR', 'TEMP', 'HM']       │   │
│  │  • Route messages based on topic suffix                         │   │
│  └─────────────────────────┬──────────────────────────────────────┘   │
│                             │                                           │
│                             ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │           SimpleUniversalHandler (⭐ DUY NHẤT)                  │   │
│  │                                                                  │   │
│  │  handleTelemetry(topic, message):                              │   │
│  │    1. Parse topic → extract cluster & device_id                │   │
│  │    2. saveRawData() → PostgreSQL                               │   │
│  │    3. broadcastRawData() → WebSocket                           │   │
│  │                                                                  │   │
│  │  handleStatus(topic, message):                                 │   │
│  │    • Broadcast device status to WebSocket                       │   │
│  │                                                                  │   │
│  │  publishCommand() / broadcastCommand():                        │   │
│  │    • Send commands back to devices via MQTT                     │   │
│  └─────────────┬────────────────────────────────┬─────────────────┘   │
│                │                                 │                      │
│                ▼                                 ▼                      │
│  ┌──────────────────────────┐    ┌─────────────────────────────────┐  │
│  │   PostgreSQL Database    │    │ SimpleUniversalWebSocketService │  │
│  │                          │    │                                  │  │
│  │  measurements table:     │    │  Creates namespaces:            │  │
│  │  ┌──────────────────┐   │    │  • /ws/BR                       │  │
│  │  │ id               │   │    │  • /ws/TEMP                     │  │
│  │  │ device_id        │   │    │  • /ws/HM                       │  │
│  │  │ cluster_code     │   │    │  • /ws/{new_cluster}            │  │
│  │  │ timestamp        │   │    │                                  │  │
│  │  │ data (JSONB) ⭐  │   │    │  Each namespace uses            │  │
│  │  │ ingest_time      │   │    │  GenericWebSocketGateway        │  │
│  │  └──────────────────┘   │    └───────────┬─────────────────────┘  │
│  └──────────────────────────┘                │                         │
│                                               │                         │
└───────────────────────────────────────────────┼─────────────────────────┘
                                                │
                                                ▼
                        ┌───────────────────────────────────┐
                        │   WebSocket Clients (Socket.IO)   │
                        └───────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   /ws/BR         │      │   /ws/TEMP       │      │   /ws/HM         │
│                  │      │                  │      │                  │
│ Rooms:           │      │ Rooms:           │      │ Rooms:           │
│ • device:ID      │      │ • device:ID      │      │ • device:ID      │
│ • cluster:BR     │      │ • cluster:TEMP   │      │ • cluster:HM     │
│ • line:ID        │      │ • line:ID        │      │ • line:ID        │
│ • position:ID    │      │ • position:ID    │      │ • position:ID    │
│                  │      │                  │      │                  │
│ Events:          │      │ Events:          │      │ Events:          │
│ • telemetry      │      │ • telemetry      │      │ • telemetry      │
│ • status         │      │ • status         │      │ • status         │
│ • command        │      │ • command        │      │ • command        │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 🔄 Data Flow Chi tiết

### 1. Telemetry Flow (Device → Server → Clients)

```
┌─────────────┐
│   Device    │ (ESP32, Raspberry Pi, ...)
│  BR-01      │
└──────┬──────┘
       │ MQTT Publish
       │ Topic: devices/BR/BR-01/telemetry
       │ Payload: { device_id: "BR-01", timestamp: "...", data: {...} }
       ▼
┌─────────────────────────────────────────────────────────────┐
│  MQTT Broker (192.168.221.4:1883)                          │
└──────┬──────────────────────────────────────────────────────┘
       │ Route to subscriber
       ▼
┌─────────────────────────────────────────────────────────────┐
│  SimpleUniversalMqttService                                 │
│  • Subscribed to: devices/BR/+/telemetry                   │
│  • onMessage() triggered                                    │
└──────┬──────────────────────────────────────────────────────┘
       │ Parse topic suffix
       │ if (topic.endsWith('/telemetry'))
       ▼
┌─────────────────────────────────────────────────────────────┐
│  SimpleUniversalHandler.handleTelemetry()                   │
│                                                              │
│  1. Parse topic: devices/BR/BR-01/telemetry                │
│     → cluster = 'BR', deviceId = 'BR-01'                   │
│                                                              │
│  2. Find device in DB: Device.findOne({ code: 'BR-01' })   │
│                                                              │
│  3. saveRawData(device, cluster, message)                  │
│     ┌────────────────────────────────────────────┐         │
│     │ await measurements.insert({                 │         │
│     │   device_id: device.id,                     │         │
│     │   cluster_code: 'BR',                       │         │
│     │   timestamp: message.timestamp,             │         │
│     │   data: message.data, // ⭐ RAW JSONB       │         │
│     │   ingest_time: new Date()                   │         │
│     │ })                                          │         │
│     └────────────────────────────────────────────┘         │
│                                                              │
│  4. broadcastRawData(cluster, deviceId, device, message)   │
│     ┌────────────────────────────────────────────┐         │
│     │ const gateway = gateways.get('/ws/BR')     │         │
│     │                                             │         │
│     │ // Broadcast to all matching rooms         │         │
│     │ gateway.server                              │         │
│     │   .to(`device:${device.id}`)               │         │
│     │   .to(`cluster:BR`)                         │         │
│     │   .to(`line:${device.line_id}`)            │         │
│     │   .to(`position:${device.position_id}`)    │         │
│     │   .emit('telemetry', {                      │         │
│     │     device_id: 'BR-01',                     │         │
│     │     cluster_code: 'BR',                     │         │
│     │     timestamp: '...',                       │         │
│     │     ...message.data  // Raw fields         │         │
│     │   })                                        │         │
│     └────────────────────────────────────────────┘         │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  WebSocket Clients                                          │
│  • Listening on /ws/BR namespace                           │
│  • Subscribed to rooms: ['device:123', 'cluster:BR']       │
│  • Receive: socket.on('telemetry', (data) => {...})       │
└─────────────────────────────────────────────────────────────┘
```

### 2. Command Flow (Client → Server → Device)

```
┌─────────────────────────────────────────────────────────────┐
│  Web Client / Mobile App                                    │
│  socket.emit('publishCommand', {                           │
│    cluster: 'BR',                                          │
│    deviceId: 'BR-01',                                      │
│    command: { action: 'reset', value: 0 }                 │
│  })                                                         │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  SimpleUniversalWebSocketGateway                            │
│  • @SubscribeMessage('publishCommand')                     │
│  • Forward to handler                                       │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  SimpleUniversalHandler.publishCommand()                    │
│  ┌────────────────────────────────────────────┐            │
│  │ mqttService.publish(                        │            │
│  │   'devices/BR/BR-01/cmd',                  │            │
│  │   { action: 'reset', value: 0 }            │            │
│  │ )                                           │            │
│  └────────────────────────────────────────────┘            │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  MQTT Broker                                                │
│  Topic: devices/BR/BR-01/cmd                               │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Device    │ MQTT Subscribe to: devices/BR/BR-01/cmd
│  BR-01      │ Execute command: reset counter
└─────────────┘
```

---

## 🗂️ Module Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        app.module.ts                                │
│                                                                      │
│  imports: [                                                         │
│    TypeOrmModule,                                                   │
│    ConfigModule,                                                    │
│    ...                                                              │
│    SimpleUniversalMqttModule,        // ⭐ MQTT                     │
│    SimpleUniversalWebSocketModule,   // ⭐ WebSocket                │
│  ]                                                                  │
└────────────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
┌──────────────────────────┐     ┌──────────────────────────────────┐
│ SimpleUniversalMqttModule│     │ SimpleUniversalWebSocketModule   │
│                          │     │                                  │
│ providers: [             │     │ providers: [                     │
│   SimpleUniversalHandler │◄────┤   SimpleUniversalWebSocketService│
│   SimpleUniversalMqtt    │     │   SimpleUniversalWebSocketGateway│
│     Service              │     │ ]                                │
│ ]                        │     │                                  │
│                          │     │ imports: [                       │
│ imports: [               │     │   SimpleUniversalMqttModule      │
│   TypeOrmModule.for      │     │ ]                                │
│     Features([Device])   │     └──────────────────────────────────┘
│ ]                        │
│                          │
│ exports: [               │
│   SimpleUniversalHandler │
│   SimpleUniversalMqtt    │
│     Service              │
│ ]                        │
└──────────────────────────┘
```

---

## ✨ Đặc điểm

- ✅ **Chỉ 1 handler** - Không cần tạo handler mới cho từng sensor type
- ✅ **Lưu raw data** - Không transform, không validate phức tạp
- ✅ **Broadcast raw data** - Client tự xử lý data theo nhu cầu
- ✅ **Dễ mở rộng** - Thêm cluster chỉ cần thêm vào danh sách

---

## 📁 File Structure (Tối giản)

```
src/
├── mqtt/
│   ├── handlers/
│   │   └── simple-universal.handler.ts       # ⭐ 1 handler duy nhất
│   ├── services/
│   │   └── simple-universal-mqtt.service.ts  # MQTT service
│   └── simple-universal-mqtt.module.ts
│
└── websocket/
    ├── services/
    │   └── simple-universal-websocket.service.ts
    ├── simple-universal-websocket.gateway.ts
    └── simple-universal-websocket.module.ts
```

**Tổng cộng: 6 files** (so với 30+ files của V2)

---

## 🚀 How It Works

### 1. MQTT Handler (simple-universal.handler.ts)

```typescript
class SimpleUniversalHandler {
  // Nhận MQTT message
  async handleTelemetry(topic: string, message: any) {
    // Parse topic: devices/BR/SAU-ME-01/telemetry
    const [_, cluster, deviceId] = topic.split('/');
    
    // Lưu RAW data vào DB
    await this.saveRawData(device, cluster, message);
    
    // Broadcast RAW data qua WebSocket
    this.broadcastRawData(cluster, deviceId, device, message);
  }
}
```

**Không validate**, **không transform** - chỉ lưu và broadcast!

---

## 📊 Database Storage

### Measurements Table (Time-Series)

```sql
CREATE TABLE measurements (
  id BIGSERIAL PRIMARY KEY,
  device_id INT,
  cluster_code VARCHAR(10),  -- 'BR', 'TEMP', 'HM', ...
  timestamp TIMESTAMP,
  data JSONB,                 -- ⭐ Lưu RAW JSONB
  ingest_time TIMESTAMP
);
```

**Tất cả sensor types** dùng chung 1 table!

---

## 🔌 MQTT Topics

### Subscribe Pattern
```
devices/{cluster_code}/+/telemetry
devices/{cluster_code}/+/status
```

### Ví dụ Messages

**Brick Counter:**
```json
{
  "device_id": "SAU-ME-01",
  "timestamp": "2025-11-21T10:00:00Z",
  "data": {
    "count": 1250,
    "error": 5,
    "rssi": -45
  }
}
```

**Temperature:**
```json
{
  "device_id": "TEMP-01",
  "timestamp": "2025-11-21T10:00:00Z",
  "data": {
    "temperature": 28.5,
    "humidity": 65.2
  }
}
```

**Pressure (mới thêm):**
```json
{
  "device_id": "PRESS-01",
  "timestamp": "2025-11-21T10:00:00Z",
  "data": {
    "pressure": 101.3,
    "unit": "kPa"
  }
}
```

**Tất cả đều work!** Không cần code gì thêm!

---

## 🌐 WebSocket Namespaces

### Auto-created Namespaces
```javascript
/ws/BR      // Brick Counter
/ws/TEMP    // Temperature
/ws/HM      // Humidity
/ws/PRESS   // Pressure (chỉ cần add vào clusters array)
```

### Client Usage
```javascript
const socket = io('http://localhost:3000/ws/BR');

// Subscribe to rooms
socket.emit('subscribe', {
  rooms: ['device:SAU-ME-01', 'cluster:BR']
});

// Receive RAW data
socket.on('telemetry', (data) => {
  console.log(data);
  // {
  //   device_id: "SAU-ME-01",
  //   cluster_code: "BR",
  //   timestamp: "...",
  //   count: 1250,      // Raw fields
  //   error: 5,
  //   rssi: -45
  // }
});
```

---

## ➕ Thêm Sensor Type Mới

### Step 1: Add to Clusters Array
```typescript
// simple-universal-mqtt.service.ts
private clusters = ['BR', 'TEMP', 'HM', 'PRESS']; // ⭐ Thêm 'PRESS'
```

```typescript
// simple-universal-websocket.service.ts
private clusters = ['BR', 'TEMP', 'HM', 'PRESS']; // ⭐ Thêm 'PRESS'
```

### Step 2: Restart Server
```bash
npm run start:dev
```

**Done!** ✅

Hệ thống tự động:
- Subscribe to `devices/PRESS/+/telemetry`
- Create namespace `/ws/PRESS`
- Lưu raw data vào `measurements` table
- Broadcast qua WebSocket

---

## 🔄 Dynamic Add Cluster (Runtime)

Không cần restart server:

```typescript
// Via API
@Post('clusters/:code/add')
async addCluster(@Param('code') code: string) {
  // Add to MQTT
  this.mqttService.addCluster(code);
  
  // Add to WebSocket
  this.wsService.addCluster(code);
  
  return { message: `Cluster ${code} added` };
}
```

---

## 💾 Data Flow

```
Device → MQTT Broker
           ↓
    SimpleUniversalHandler
           ↓
    ┌──────┴──────┐
    ↓             ↓
Save Raw Data   Broadcast Raw Data
(measurements)  (WebSocket)
    ↓             ↓
PostgreSQL    Client Apps
```

**Không có transform, không có validation phức tạp!**

---

## 📋 Code Comparison

### ❌ Old Way (V2):
```typescript
// BrickCounterHandler.ts (200 lines)
// TemperatureHandler.ts (200 lines)
// HumidityHandler.ts (200 lines)
// ... 30+ files total
```

### ✅ Simple Universal:
```typescript
// simple-universal.handler.ts (200 lines)
// ⭐ DUY NHẤT - xử lý TẤT CẢ
```

**Giảm 90% code!**

---

## 🧪 Testing

Same test scripts work:

```bash
# MQTT
python test-mqtt-multi-cluster.py

# WebSocket
# Open: test-websocket-multi-namespace.html
```

---

## 📊 Comparison Table

| Feature | V1 (Old) | V2 (Per-Cluster) | **Simple Universal** |
|---------|----------|------------------|----------------------|
| **Files** | 10+ | 30+ | **6** ⭐ |
| **Add sensor** | Code change | Code change | **Array update** |
| **Complexity** | Medium | High | **Very Low** ⭐ |
| **Maintenance** | Medium | Hard | **Easy** ⭐ |
| **Validation** | Some | Complex | **None** (raw data) |
| **Transform** | Some | Complex | **None** (raw data) |
| **Storage** | Mixed | Configurable | **Raw JSONB** ⭐ |

---

## ✅ Pros & Cons

### Pros ✅
- Cực kỳ đơn giản
- Dễ maintain
- Thêm sensor type chỉ cần 1 dòng
- Không cần database migration phức tạp
- Raw data → Client tự xử lý theo nhu cầu

### Cons ⚠️
- Không validate data (trust device)
- Không transform data (client phải xử lý)
- Tất cả sensor share 1 table (có thể cần index tốt)

---

## 🎯 Khi Nào Dùng?

### ✅ Dùng Simple Universal khi:
- Nhiều loại sensor khác nhau
- Data structure thay đổi thường xuyên
- Muốn flexibility cao
- Team nhỏ, cần maintain dễ
- Chưa biết rõ business logic

### ⚠️ Cân nhắc V2 khi:
- Cần validation chặt chẽ
- Cần transform data phức tạp
- Mỗi sensor có business logic riêng
- Cần optimize query cho từng sensor type

---

## 🚀 Recommendation

**Start with Simple Universal**, sau này nếu cần thì:
1. Keep raw data trong `measurements` table
2. Create materialized views cho từng sensor type
3. Add background jobs để process raw data
4. Migrate sang V2 nếu cần

**Simple → Complex dễ hơn Complex → Simple!**

---

## 📝 Example: Add New "VIBRATION" Sensor

### Step 1: Update Arrays
```typescript
// 2 chỗ thay đổi:
private clusters = ['BR', 'TEMP', 'HM', 'VIBRATION'];
```

### Step 2: Publish MQTT
```python
topic = "devices/VIBRATION/VIB-01/telemetry"
payload = {
  "device_id": "VIB-01",
  "timestamp": "2025-11-21T10:00:00Z",
  "data": {
    "frequency": 60.5,
    "amplitude": 0.05,
    "unit": "Hz"
  }
}
```

### Step 3: Connect WebSocket
```javascript
const vibSocket = io('http://localhost:3000/ws/VIBRATION');
vibSocket.on('telemetry', (data) => {
  console.log('Vibration:', data.frequency, data.amplitude);
});
```

**That's it!** 🎉

---

**Version**: Simple Universal 1.0  
**Recommended for**: Rapid development, Multiple sensor types, Easy maintenance
