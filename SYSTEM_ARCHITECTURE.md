# Kiến trúc Hệ thống IoT Tổng thể

## 📊 Tổng quan Database Schema

### Các thành phần chính:
```
measurement_types (loại đo: brick_count, temperature, humidity)
    ↓
device_clusters (cụm thiết bị: BR=Brick, HM=Humidity, TEMP=Temperature)
    ↓
devices (thiết bị cụ thể)
    ↓
measurements (time-series data - partitioned)
```

---

## 🔄 Luồng dữ liệu tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVICE LAYER (IoT Devices)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Brick Counter│  │  Temp Sensor │  │ Humidity Sen │         │
│  │  SAU-ME-01    │  │  TEMP-01     │  │  HM-01       │         │
│  │  cluster: BR  │  │  cluster: TEMP│  │  cluster: HM │         │
│  └───────┬────────┘  └───────┬──────┘  └───────┬──────┘         │
│          │                   │                  │                 │
│          │ Pub Topics:       │                  │                 │
│          │ devices/BR/SAU-ME-01/telemetry       │                 │
│          │ devices/BR/SAU-ME-01/status          │                 │
│          │                   │                  │                 │
│          │ Sub Topics:       │                  │                 │
│          │ devices/BR/SAU-ME-01/cmd             │                 │
│          │ clusters/BR/cmd                       │                 │
└──────────┼───────────────────┼──────────────────┼─────────────────┘
           │                   │                  │
           ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MQTT BROKER (Mosquitto)                      │
├─────────────────────────────────────────────────────────────────┤
│  Topics Structure:                                              │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ devices/{cluster_code}/{device_id}/telemetry   (Device→Srv)││
│  │ devices/{cluster_code}/{device_id}/status      (Device→Srv)││
│  │ devices/{cluster_code}/{device_id}/cmd         (Srv→Device)││
│  │ clusters/{cluster_code}/cmd                    (Srv→All)   ││
│  │ clusters/{cluster_code}/telemetry              (All→Srv)   ││
│  └────────────────────────────────────────────────────────────┘│
└──────────┬─────────────────────────────────────────────┬────────┘
           │                                             │
           │ Subscribe All Topics                        │
           ▼                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND SERVER (NestJS)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           MQTT Service (mqtt.service.ts)                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • Connect to MQTT Broker                                │  │
│  │  • Dynamic Topic Subscription based on DB config         │  │
│  │  • Route messages to appropriate handlers                │  │
│  │  • Publish commands to devices/clusters                  │  │
│  └─────────┬────────────────────────────────────────────────┘  │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Cluster-Specific Handlers                         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • BrickCounterHandler (cluster: BR)                     │  │
│  │  • TemperatureHandler (cluster: TEMP)                    │  │
│  │  • HumidityHandler (cluster: HM)                         │  │
│  │  • ... (Dễ dàng thêm handler mới)                        │  │
│  └─────────┬────────────────────────────────────────────────┘  │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Measurement Repository                         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • Insert vào bảng measurements (time-series)            │  │
│  │  • Partition by timestamp tự động                        │  │
│  │  • Bulk insert cho performance                           │  │
│  └─────────┬────────────────────────────────────────────────┘  │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           WebSocket Gateway                              │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • Room-based broadcasting                               │  │
│  │  • Namespace per cluster: /ws/BR, /ws/TEMP, /ws/HM      │  │
│  │  • Client subscription management                        │  │
│  │  • Real-time data push                                   │  │
│  └─────────┬────────────────────────────────────────────────┘  │
│            │                                                    │
└────────────┼────────────────────────────────────────────────────┘
             │
             │ WebSocket Connections
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WEB CLIENT (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        WebSocket Client Manager                          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • Connect to namespaces: /ws/BR, /ws/TEMP, /ws/HM       │  │
│  │  • Subscribe to rooms:                                   │  │
│  │    - device:{device_id}                                  │  │
│  │    - cluster:{cluster_code}                              │  │
│  │    - production_line:{line_id}                           │  │
│  │  • Auto-reconnect on disconnect                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Dashboard Components                           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • BrickCounterDashboard (subscribe /ws/BR)             │  │
│  │  • TemperatureDashboard (subscribe /ws/TEMP)            │  │
│  │  • HumidityDashboard (subscribe /ws/HM)                 │  │
│  │  • ProductionLineDashboard (aggregate all clusters)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 MQTT Topic Design (Scalable)

### 1. Topic Structure

```
Telemetry (Device → Server):
  devices/{cluster_code}/{device_id}/telemetry
  
Status Updates (Device → Server):
  devices/{cluster_code}/{device_id}/status
  
Commands (Server → Specific Device):
  devices/{cluster_code}/{device_id}/cmd
  
Broadcast Commands (Server → All Devices in Cluster):
  clusters/{cluster_code}/cmd
  
Cluster-wide Telemetry (Optional):
  clusters/{cluster_code}/telemetry
```

### 2. Ví dụ Topics

#### Brick Counter Cluster (BR)
```
Pub Topics (Device):
  devices/BR/SAU-ME-01/telemetry
  devices/BR/SAU-ME-01/status
  
Sub Topics (Device):
  devices/BR/SAU-ME-01/cmd
  clusters/BR/cmd
```

#### Temperature Cluster (TEMP)
```
Pub Topics (Device):
  devices/TEMP/TEMP-ZONE-01/telemetry
  devices/TEMP/TEMP-ZONE-01/status
  
Sub Topics (Device):
  devices/TEMP/TEMP-ZONE-01/cmd
  clusters/TEMP/cmd
```

#### Humidity Cluster (HM)
```
Pub Topics (Device):
  devices/HM/HM-ROOM-01/telemetry
  devices/HM/HM-ROOM-01/status
  
Sub Topics (Device):
  devices/HM/HM-ROOM-01/cmd
  clusters/HM/cmd
```

### 3. Payload Examples

#### Brick Counter Telemetry
```json
{
  "device_id": "SAU-ME-01",
  "cluster_code": "BR",
  "type_code": "brick_count",
  "timestamp": "2025-11-21T10:30:00Z",
  "data": {
    "count": 1250,
    "error": 5,
    "rssi": -45,
    "battery": 85,
    "temperature": 25.5
  }
}
```

#### Temperature Telemetry
```json
{
  "device_id": "TEMP-ZONE-01",
  "cluster_code": "TEMP",
  "type_code": "temperature",
  "timestamp": "2025-11-21T10:30:00Z",
  "data": {
    "temperature": 28.5,
    "humidity": 65.2,
    "heat_index": 30.1
  }
}
```

#### Humidity Telemetry
```json
{
  "device_id": "HM-ROOM-01",
  "cluster_code": "HM",
  "type_code": "humidity",
  "timestamp": "2025-11-21T10:30:00Z",
  "data": {
    "humidity": 72.5,
    "temperature": 24.0,
    "dew_point": 18.5
  }
}
```

---

## 🔌 WebSocket Design (Real-time Updates)

### 1. Namespace Architecture

```typescript
// Backend: Namespaces per cluster
const wsNamespaces = {
  '/ws/BR': BrickCounterNamespace,     // Brick counters
  '/ws/TEMP': TemperatureNamespace,    // Temperature sensors
  '/ws/HM': HumidityNamespace,         // Humidity sensors
  '/ws/analytics': AnalyticsNamespace  // Cross-cluster analytics
}
```

### 2. Room-based Subscription

Clients có thể subscribe vào các rooms sau:

```typescript
// Room types
rooms = {
  // Device-level (specific device)
  device: `device:${device_id}`,              // e.g., "device:SAU-ME-01"
  
  // Cluster-level (all devices in cluster)
  cluster: `cluster:${cluster_code}`,         // e.g., "cluster:BR"
  
  // Production line-level (all devices on line)
  production_line: `line:${line_id}`,         // e.g., "line:DC-01"
  
  // Position-level (devices at position)
  position: `position:${position_id}`,        // e.g., "position:SAU-ME"
  
  // Workshop-level (all devices in workshop)
  workshop: `workshop:${workshop_id}`         // e.g., "workshop:WS-01"
}
```

### 3. Client Subscription Flow

```typescript
// Frontend: Connect to namespace
const brickSocket = io('http://localhost:3000/ws/BR', {
  auth: { token: authToken }
});

// Subscribe to specific rooms
brickSocket.emit('subscribe', {
  rooms: [
    'device:SAU-ME-01',           // Specific device
    'cluster:BR',                  // All brick counters
    'line:DC-01'                   // Production line DC-01
  ]
});

// Listen for telemetry updates
brickSocket.on('telemetry', (data) => {
  console.log('Brick count update:', data);
  updateUI(data);
});

// Listen for status updates
brickSocket.on('status', (data) => {
  console.log('Device status:', data);
  updateDeviceStatus(data);
});
```

### 4. Server-side Broadcasting

```typescript
// Backend: Broadcast to rooms when MQTT message arrives
async handleBrickCounterTelemetry(message: BrickCounterMessage) {
  // Save to database
  await this.measurementRepo.insert(message);
  
  // Broadcast via WebSocket to multiple rooms
  const rooms = [
    `device:${message.device_id}`,
    `cluster:${message.cluster_code}`,
    `line:${device.production_line_id}`,
    `position:${device.position_id}`
  ];
  
  this.wsGateway.broadcastToRooms('/ws/BR', rooms, 'telemetry', {
    device_id: message.device_id,
    count: message.data.count,
    timestamp: message.timestamp,
    ...message.data
  });
}
```

---

## 🏗️ Database Configuration for Dynamic Topics

### Device Clusters Table
```sql
-- device_clusters table config
{
  "code": "BR",
  "name": "Brick Counter Cluster",
  "measurement_type_id": 1,
  "config": {
    "qos": 1,
    "retain": false,
    "interval_ms": 1000
  },
  "pub_topics": [
    "devices/BR/+/telemetry",    -- Subscribe to all BR devices
    "devices/BR/+/status"
  ],
  "sub_topics": [
    "clusters/BR/cmd"             -- Server can publish commands
  ]
}
```

### Device Table
```sql
-- devices table config
{
  "deviceId": "SAU-ME-01",
  "cluster_id": 1,  -- Points to BR cluster
  "extra_info": {
    "mqtt": {
      "qos": 1,
      "client_id": "SAU-ME-01",
      "interval_ms": 1000
    }
  },
  "pub_topics": [
    "devices/BR/SAU-ME-01/telemetry",
    "devices/BR/SAU-ME-01/status"
  ],
  "sub_topics": [
    "devices/BR/SAU-ME-01/cmd",
    "clusters/BR/cmd"
  ]
}
```

---

## 🚀 Backend Implementation Strategy

### 1. MQTT Service (Dynamic Topic Management)

```typescript
// mqtt.service.ts
@Injectable()
export class MqttService implements OnModuleInit {
  private client: MqttClient;
  private clusterHandlers = new Map<string, ClusterHandler>();
  
  async onModuleInit() {
    // Load cluster configs from database
    const clusters = await this.clusterRepo.findAll();
    
    // Register handlers for each cluster
    for (const cluster of clusters) {
      const handler = this.getHandlerForCluster(cluster.code);
      this.clusterHandlers.set(cluster.code, handler);
      
      // Subscribe to cluster topics
      for (const topic of cluster.pub_topics) {
        await this.client.subscribeAsync(topic, { qos: 1 });
      }
    }
    
    // Handle incoming messages
    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });
  }
  
  private async handleMessage(topic: string, payload: Buffer) {
    // Parse topic: devices/{cluster}/{device_id}/telemetry
    const parts = topic.split('/');
    const clusterCode = parts[1];
    const deviceId = parts[2];
    const messageType = parts[3];
    
    // Get appropriate handler
    const handler = this.clusterHandlers.get(clusterCode);
    if (!handler) {
      this.logger.warn(`No handler for cluster: ${clusterCode}`);
      return;
    }
    
    // Parse payload
    const message = JSON.parse(payload.toString());
    
    // Route to handler
    await handler.handleTelemetry(deviceId, message);
  }
  
  async publishCommand(clusterId: string, deviceId: string, command: any) {
    const topic = `devices/${clusterId}/${deviceId}/cmd`;
    await this.client.publishAsync(topic, JSON.stringify(command));
  }
  
  async broadcastToCluster(clusterId: string, command: any) {
    const topic = `clusters/${clusterId}/cmd`;
    await this.client.publishAsync(topic, JSON.stringify(command));
  }
}
```

### 2. Cluster Handler Interface

```typescript
// cluster-handler.interface.ts
export interface ClusterHandler {
  clusterCode: string;
  
  handleTelemetry(deviceId: string, message: any): Promise<void>;
  handleStatus(deviceId: string, message: any): Promise<void>;
  validatePayload(message: any): boolean;
}

// brick-counter.handler.ts
@Injectable()
export class BrickCounterHandler implements ClusterHandler {
  clusterCode = 'BR';
  
  async handleTelemetry(deviceId: string, message: any) {
    // Validate payload
    if (!this.validatePayload(message)) {
      throw new Error('Invalid brick counter payload');
    }
    
    // Save to measurements table
    await this.measurementRepo.insert({
      device_id: await this.getDeviceDbId(deviceId),
      cluster_id: await this.getClusterDbId('BR'),
      type_id: await this.getTypeId('brick_count'),
      timestamp: new Date(message.timestamp),
      data: message.data
    });
    
    // Broadcast via WebSocket
    await this.wsGateway.broadcastBrickCount(deviceId, message.data);
  }
  
  validatePayload(message: any): boolean {
    return (
      message.data &&
      typeof message.data.count === 'number' &&
      typeof message.data.error === 'number'
    );
  }
}
```

### 3. WebSocket Gateway (Multi-Namespace)

```typescript
// websocket.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws/BR'
})
export class BrickCounterGateway {
  @WebSocketServer()
  server: Server;
  
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, rooms: string[]) {
    for (const room of rooms) {
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
    }
  }
  
  async broadcastBrickCount(deviceId: string, data: any) {
    const device = await this.deviceRepo.findByDeviceId(deviceId);
    
    const rooms = [
      `device:${deviceId}`,
      `cluster:BR`,
      `line:${device.position.productionLine.id}`,
      `position:${device.position.id}`
    ];
    
    for (const room of rooms) {
      this.server.to(room).emit('telemetry', {
        device_id: deviceId,
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Similar gateways for Temperature, Humidity, etc.
@WebSocketGateway({ namespace: '/ws/TEMP' })
export class TemperatureGateway { ... }

@WebSocketGateway({ namespace: '/ws/HM' })
export class HumidityGateway { ... }
```

---

## 📱 Frontend WebSocket Client

### 1. Multi-Namespace Hook

```typescript
// hooks/useMultiNamespace.ts
export function useMultiNamespace() {
  const [sockets, setSockets] = useState<Map<string, Socket>>(new Map());
  
  const connect = useCallback((namespace: string, rooms: string[]) => {
    const socket = io(`${WS_URL}${namespace}`, {
      auth: { token: getAuthToken() }
    });
    
    socket.on('connect', () => {
      console.log(`Connected to ${namespace}`);
      socket.emit('subscribe', rooms);
    });
    
    setSockets(prev => new Map(prev).set(namespace, socket));
    
    return socket;
  }, []);
  
  const disconnect = useCallback((namespace: string) => {
    const socket = sockets.get(namespace);
    if (socket) {
      socket.disconnect();
      setSockets(prev => {
        const newMap = new Map(prev);
        newMap.delete(namespace);
        return newMap;
      });
    }
  }, [sockets]);
  
  return { connect, disconnect, sockets };
}
```

### 2. Dashboard Component Example

```typescript
// components/BrickCounterDashboard.tsx
export function BrickCounterDashboard({ productionLineId }: Props) {
  const { connect, disconnect } = useMultiNamespace();
  const [brickData, setBrickData] = useState<Map<string, any>>(new Map());
  
  useEffect(() => {
    // Connect to brick counter namespace
    const socket = connect('/ws/BR', [
      `line:${productionLineId}`,  // Subscribe to production line
      `cluster:BR`                  // Subscribe to all brick counters
    ]);
    
    // Listen for telemetry updates
    socket.on('telemetry', (data) => {
      setBrickData(prev => new Map(prev).set(data.device_id, data));
    });
    
    // Listen for status updates
    socket.on('status', (data) => {
      console.log('Device status:', data);
    });
    
    return () => {
      disconnect('/ws/BR');
    };
  }, [productionLineId]);
  
  return (
    <div>
      {Array.from(brickData.entries()).map(([deviceId, data]) => (
        <DeviceCard key={deviceId} deviceId={deviceId} data={data} />
      ))}
    </div>
  );
}
```

---

## 🎛️ Admin Panel: Topic Configuration

### Web UI cho config topics

```typescript
// Admin panel để config device topics
export function DeviceTopicConfig({ device }: Props) {
  const [pubTopics, setPubTopics] = useState<string[]>(device.pub_topics);
  const [subTopics, setSubTopics] = useState<string[]>(device.sub_topics);
  
  const handleSave = async () => {
    await api.updateDevice(device.id, {
      pub_topics: pubTopics,
      sub_topics: subTopics
    });
    
    // Trigger MQTT service to reload topics
    await api.reloadMqttTopics();
  };
  
  return (
    <div>
      <h3>Publish Topics</h3>
      <TopicEditor topics={pubTopics} onChange={setPubTopics} />
      
      <h3>Subscribe Topics</h3>
      <TopicEditor topics={subTopics} onChange={setSubTopics} />
      
      <button onClick={handleSave}>Save & Reload</button>
    </div>
  );
}
```

---

## 🔄 Migration Plan

### Phase 1: Core Infrastructure
1. ✅ Tạo bảng mới: measurement_types, device_clusters
2. ✅ Migrate existing devices sang schema mới
3. ✅ Setup measurements table với partitioning

### Phase 2: MQTT Refactor
1. Implement dynamic topic subscription
2. Create cluster handlers (BR, TEMP, HM)
3. Migrate existing MQTT logic sang handler pattern

### Phase 3: WebSocket Refactor
1. Implement multi-namespace architecture
2. Create room-based subscription system
3. Migrate existing WebSocket logic

### Phase 4: Frontend Update
1. Update client to use multi-namespace
2. Create dashboard components per cluster
3. Add admin panel for topic config

---

## ✅ Ưu điểm của kiến trúc này

1. **Scalable**: Dễ dàng thêm cluster/sensor type mới
2. **Flexible Topics**: Config pub/sub topics từ database
3. **Room-based WS**: Client chỉ nhận data mình quan tâm
4. **Type-safe**: Handler per cluster đảm bảo data validation
5. **Performance**: Partitioned measurements table, bulk insert
6. **Real-time**: WebSocket namespace riêng cho từng loại sensor
7. **Maintainable**: Separation of concerns rõ ràng

Bạn muốn tôi implement phần nào trước? MQTT Service, WebSocket Gateway, hay Database migrations?
