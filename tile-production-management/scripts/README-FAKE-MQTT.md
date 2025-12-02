# Fake MQTT Telemetry Publisher

Script Python để fake gửi dữ liệu telemetry từ thiết bị đếm gạch tới MQTT broker.

## Cài đặt

```bash
pip install paho-mqtt
```

## Cấu hình

Mở file `fake-mqtt-telemetry.py` và điều chỉnh:

```python
MQTT_BROKER = "localhost"  # Địa chỉ MQTT broker
MQTT_PORT = 1883           # Port của MQTT broker
MQTT_USERNAME = None       # Username nếu cần authentication
MQTT_PASSWORD = None       # Password nếu cần authentication
```

## Chạy script

```bash
python fake-mqtt-telemetry.py
```

## Tính năng

- ✅ Gửi telemetry data theo đúng schema từ `main.ts` (measurement_types)
- ✅ Fake 8 thiết bị (matching với seedDevices trong main.ts)
- ✅ Random tăng counter 1-2 viên mỗi giây
- ✅ Gửi message mỗi 3 giây
- ✅ Topic pattern: `devices/mdg/cluster/{deviceId}/telemetry`

## Data Schema

```json
{
  "ts": "2025-12-02T10:30:45.123Z",
  "deviceId": "SAU-ME1-DC1-PX1",
  "metrics": {
    "sensors": {
      "sensor_1": 2,
      "sensor_2": 1,
      "sensor_3": 0
    },
    "total": 1245,
    "error": {}
  },
  "quality": {
    "rssi": -65,
    "battery": 85,
    "uptime": 43200
  }
}
```

## Devices

- SAU-ME1-DC1-PX1 (Sau máy ép 1)
- SAU-ME2-DC1-PX1 (Sau máy ép 2)
- TRUOC-LN1-DC1-PX1 (Trước lò nung 1)
- TRUOC-LN2-DC1-PX1 (Trước lò nung 2)
- SAU-LN-DC1-PX1 (Sau lò nung)
- TRUOC-M-DC1-PX1 (Trước mài)
- SAU-M-DC1-PX1 (Sau mài)
- TRUOC-DH-DC1-PX1 (Trước đóng hộp)

## Dừng script

Nhấn `Ctrl+C` để dừng script.
