# MQTT & WebSocket Integration

Tài liệu hướng dẫn thiết kế luồng MQTT và WebSocket trong tile-production-management, được thiết kế dựa trên kiến trúc của old-vicenza-ims-web (Django).

## Kiến trúc Tổng quan

```
MQTT Broker
    ↓
MqttService (nhận messages)
    ↓
MessageQueueService (xử lý với Redis locks)
    ↓
DevicesMqttHandler / ProductionsMqttHandler
    ↓
WebSocketGateway (broadcast đến frontend)
    ↓
Frontend Clients
```

## Cấu trúc Module

### 1. Common Modules

#### `src/common/cache/bounded-cache.service.ts`
- **BoundedCacheService**: Cache với giới hạn kích thước và TTL
  - Tự động xóa entries cũ nhất khi đạt max_size
  - Cleanup định kỳ các expired entries
  - Thread-safe với Map built-in
  
- **RateLimitCacheService**: Rate limiting cho WebSocket broadcast
  - Tránh broadcast quá nhiều lần trong thời gian ngắn
  - Configurable min_interval

#### `src/common/queue/message-queue.service.ts`
- **MessageQueueService**: Message queue với Redis locks
  - `processWithLock()`: Xử lý message với lock để tránh race condition
  - `processOrdered()`: Xử lý message theo thứ tự timestamp
  - Exponential backoff cho retry logic

### 2. MQTT Module

#### `src/mqtt/mqtt.service.ts`
- Kết nối đến MQTT broker với auto-reconnect
- Subscribe các topics:
  - `devices/+/telemetry`
  - `devices/+/health`
  - `devices/+/state`
  - `broadcast/+/resp`
  - `broadcast/+/confirm`
- Parse và route messages đến các handlers
- Publish messages với QoS support

#### `src/mqtt/mqtt.module.ts`
- Global module export MqttService
- Cấu hình Redis client
- Khởi tạo BoundedCacheService

### 3. WebSocket Module

#### `src/websocket/websocket.gateway.ts`
- WebSocket Gateway sử dụng Socket.IO
- Support rooms/channels cho broadcast có mục tiêu
- Methods:
  - `broadcast(room, event, data)`: Broadcast đến room cụ thể
  - `broadcastToAll(event, data)`: Broadcast đến tất cả clients
  - `broadcastDeviceUpdate()`: Broadcast device data updates
  - `broadcastProductionUpdate()`: Broadcast production updates
  - `broadcastBatchDeviceUpdate()`: Batch updates

### 4. Devices Module

#### `src/devices/devices-mqtt.handler.ts`
- Đăng ký telemetry và health handlers với MqttService
- Xử lý telemetry messages:
  - Validate dữ liệu (count, err_count, rssi)
  - Lưu vào cache
  - Broadcast qua WebSocket với rate limiting
- Xử lý health messages:
  - Update device status và battery
  - Broadcast health updates

## Luồng Dữ liệu

### 1. Nhận MQTT Message

```typescript
// Device gửi telemetry
Topic: devices/TRUOC-DH-01/telemetry
Payload: {
  "deviceId": "TRUOC-DH-01",
  "ts": "2024-01-15T10:30:00Z",
  "metrics": {
    "count": 1250,
    "err_count": 5
  },
  "quality": {
    "rssi": -65
  }
}
```

### 2. Xử lý trong MqttService

```typescript
// mqtt.service.ts
onMessage(topic, payload) {
  const [type, deviceId, messageType] = topic.split('/');
  
  if (messageType === 'telemetry') {
    // Dispatch đến tất cả telemetry handlers
    for (const handler of telemetryHandlers) {
      await messageQueue.processOrdered(
        deviceId,
        timestamp,
        messageData,
        handler
      );
    }
  }
}
```

### 3. Xử lý trong DevicesMqttHandler

```typescript
// devices-mqtt.handler.ts
handleTelemetryMessage(deviceId, message) {
  // Validate data
  const count = message.metrics.count;
  const errCount = message.metrics.err_count;
  
  // Lưu vào cache
  this.deviceLatestData.set(deviceId, {
    count,
    errCount,
    timestamp: new Date()
  });
  
  // Broadcast với rate limiting
  if (this.rateLimiter.shouldBroadcast(deviceId)) {
    this.websocketGateway.broadcastDeviceUpdate(deviceId, {
      count,
      errCount
    });
  }
}
```

### 4. WebSocket Broadcast

```typescript
// websocket.gateway.ts
broadcastDeviceUpdate(deviceId, data) {
  this.server.to('devices').emit('device_update', {
    deviceId,
    ...data
  });
}
```

## Cấu hình Environment

Tạo file `.env` từ `.env.example`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=123456
DB_NAME=brick-counter-dev

# MQTT
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
PORT=3000
NODE_ENV=development
```

## Cài đặt Dependencies

```bash
npm install
```

Các dependencies chính:
- `mqtt`: MQTT client
- `@nestjs/websockets` + `@nestjs/platform-socket.io`: WebSocket support
- `ioredis`: Redis client cho locks và cache
- `@nestjs/config`: Environment configuration

## Chạy Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Testing

### Test MQTT Connection

```typescript
// test-mqtt.ts
import * as mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('Connected to MQTT');
  
  // Publish test message
  client.publish('devices/TEST-01/telemetry', JSON.stringify({
    deviceId: 'TEST-01',
    ts: new Date().toISOString(),
    metrics: {
      count: 100,
      err_count: 0
    },
    quality: {
      rssi: -60
    }
  }));
});
```

### Test WebSocket Connection

```html
<!-- test-websocket.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <script>
    const socket = io('http://localhost:3000');
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });
    
    socket.on('device_update', (data) => {
      console.log('Device update:', data);
    });
  </script>
</body>
</html>
```

## So sánh với Django (old-vicenza-ims-web)

| Django (Python) | NestJS (TypeScript) |
|----------------|---------------------|
| `mqtt_service/mqtt_client.py` | `src/mqtt/mqtt.service.ts` |
| `mqtt_service/bounded_cache.py` | `src/common/cache/bounded-cache.service.ts` |
| `mqtt_service/message_queue.py` | `src/common/queue/message-queue.service.ts` |
| `websocket_service/websocket_client.py` | `src/websocket/websocket.gateway.ts` |
| `apps/tong_quan/mqtt_handler.py` | `src/devices/devices-mqtt.handler.ts` |
| Django Channels | Socket.IO |
| Redis (channels_redis) | Redis (ioredis) |
| Paho MQTT | mqtt.js |

## Tính năng Chính

### 1. Thread-Safety với Redis Locks
- Tránh race conditions khi nhiều messages đến cùng lúc
- Atomic operations với Redis SET NX EX

### 2. Ordered Message Processing
- Kiểm tra timestamp để xử lý messages theo đúng thứ tự
- Skip out-of-order messages

### 3. Rate Limiting
- Giảm tải WebSocket broadcast
- Configurable min_interval cho mỗi device

### 4. Bounded Cache
- Tự động cleanup expired entries
- Giới hạn kích thước để tránh memory leaks
- LRU eviction strategy

### 5. Reconnection Logic
- Auto-reconnect MQTT với exponential backoff
- Retry strategy cho Redis operations

## Mở rộng

### Thêm Handler mới

```typescript
// src/productions/productions-mqtt.handler.ts
@Injectable()
export class ProductionsMqttHandler implements OnModuleInit {
  constructor(private mqttService: MqttService) {}
  
  onModuleInit() {
    this.mqttService.registerTelemetryHandler(
      'productions',
      this.handleTelemetryMessage.bind(this)
    );
  }
  
  async handleTelemetryMessage(deviceId: string, data: any) {
    // Xử lý logic cho productions
  }
}
```

### Custom WebSocket Events

```typescript
// websocket.gateway.ts
broadcastCustomEvent(room: string, eventName: string, data: any) {
  this.server.to(room).emit(eventName, data);
}
```

## Troubleshooting

### MQTT không kết nối
- Kiểm tra MQTT broker đang chạy: `mosquitto -v`
- Kiểm tra credentials trong `.env`

### Redis errors
- Kiểm tra Redis server: `redis-cli ping`
- Kiểm tra Redis host/port trong `.env`

### WebSocket không nhận data
- Mở DevTools Console để xem errors
- Kiểm tra CORS configuration
- Verify client đã join đúng room

## Performance Tips

1. **Adjust cache sizes**: Tăng `max_size` nếu có nhiều devices
2. **Tune rate limiting**: Giảm `min_interval` nếu cần real-time hơn
3. **Redis connection pooling**: Sử dụng Redis cluster cho production
4. **WebSocket rooms**: Phân chia clients vào các rooms khác nhau

## Tài liệu tham khảo

- [MQTT.js Documentation](https://github.com/mqttjs/MQTT.js)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)
- [ioredis Documentation](https://github.com/redis/ioredis)
