#!/usr/bin/env python3
"""
Fake MQTT Telemetry Publisher for Brick Counter Devices
Gửi dữ liệu giả lập từ thiết bị đếm gạch tới MQTT broker
"""

import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime

# =====================================
# CONFIGURATION
# =====================================
MQTT_BROKER = "192.168.221.4"
MQTT_PORT = 1883
MQTT_USERNAME = None  # Set if authentication is required
MQTT_PASSWORD = None

# Device configurations (matching main.ts seedDevices)
DEVICES = [
    "SAU-ME1-DC1-PX1",
    "SAU-ME2-DC1-PX1",
    "TRUOC-LN1-DC1-PX1",
    "TRUOC-LN2-DC1-PX1",
    "SAU-LN-DC1-PX1",
    "TRUOC-M-DC1-PX1",
    "SAU-M-DC1-PX1",
    "TRUOC-DH-DC1-PX1",
]

# Topic pattern: devices/mdg/+/{deviceId}/telemetry
TOPIC_PATTERN = "devices/mdg/{deviceId}/telemetry"

# Counters for each device
device_counters = {device_id: random.randint(100, 500) for device_id in DEVICES}

# =====================================
# MQTT CALLBACKS
# =====================================
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to MQTT Broker successfully!")
        print(f"📡 Broker: {MQTT_BROKER}:{MQTT_PORT}")
        print(f"🔧 Devices: {len(DEVICES)}")
        print("-" * 60)
    else:
        print(f"❌ Failed to connect, return code {rc}")

def on_publish(client, userdata, mid):
    pass  # Silent publishing

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠️  Unexpected disconnection. Return code: {rc}")

# =====================================
# DATA GENERATION
# =====================================
def generate_telemetry_data(device_id: str) -> dict:
    """
    Generate telemetry data matching the schema from main.ts:
    {
      ts: string (ISO date-time),
      deviceId: string,
      metrics: {
        sensors: { [key: string]: number },
        total: number,
        error: { [key: string]: any }
      },
      quality: { [key: string]: any }
    }
    """
    # Increment counter by 1-2 randomly
    device_counters[device_id] += random.randint(1, 2)
    
    # Generate sensor data (simulating multiple sensors)
    num_sensors = random.randint(2, 4)  # 2-4 sensors per device
    sensors_data = {}
    sensor_total = 0
    
    for i in range(num_sensors):
        sensor_count = random.randint(0, 3)  # Each sensor contributes 0-3
        sensors_data[f"sensor_{i+1}"] = sensor_count
        sensor_total += sensor_count
    
    # Error data (random errors sometimes)
    error_data = {}
    if random.random() < 0.1:  # 10% chance of error
        error_data["error_code"] = random.choice(["E001", "E002", "E003"])
        error_data["error_message"] = "Sensor communication issue"
    
    # Quality data (RSSI signal strength)
    rssi = random.randint(-90, -30)  # WiFi signal strength in dBm
    
    telemetry = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "deviceId": device_id,
        "metrics": {
            "sensors": sensors_data,
            "total": device_counters[device_id],
            "error": error_data
        },
        "quality": {
            "rssi": rssi,
            "battery": random.randint(75, 100),  # Battery percentage
            "uptime": random.randint(3600, 86400)  # Uptime in seconds
        }
    }
    
    return telemetry

# =====================================
# MAIN LOOP
# =====================================
def main():
    # Create MQTT client
    client = mqtt.Client(client_id="fake-telemetry-publisher", clean_session=True)
    
    # Set callbacks
    client.on_connect = on_connect
    client.on_publish = on_publish
    client.on_disconnect = on_disconnect
    
    # Set authentication if needed
    if MQTT_USERNAME and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    # Connect to broker
    try:
        print(f"🔌 Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}...")
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        client.loop_start()
        
        # Wait for connection
        time.sleep(2)
        
        print("\n🚀 Starting telemetry simulation...")
        print("📊 Publishing every 3 seconds")
        print("⏹️  Press Ctrl+C to stop\n")
        
        iteration = 0
        while True:
            iteration += 1
            print(f"\n{'='*60}")
            print(f"📤 Iteration #{iteration} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"{'='*60}")
            
            # Publish telemetry for each device
            for device_id in DEVICES:
                # Generate telemetry data
                telemetry = generate_telemetry_data(device_id)
                
                # Create topic
                topic = TOPIC_PATTERN.format(deviceId=device_id)
                
                # Publish message
                payload = json.dumps(telemetry)
                result = client.publish(topic, payload, qos=1)
                
                # Check if publish was successful
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    print(f"✅ {device_id:20} → Total: {telemetry['metrics']['total']:5} | RSSI: {telemetry['quality']['rssi']:3} dBm | Topic: {topic}")
                else:
                    print(f"❌ {device_id:20} → Failed to publish (rc={result.rc})")
            
            # Wait 3 seconds before next iteration
            time.sleep(3)
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping telemetry simulation...")
        print("📊 Final counters:")
        for device_id, count in device_counters.items():
            print(f"   {device_id}: {count}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        
    finally:
        client.loop_stop()
        client.disconnect()
        print("\n👋 Disconnected from MQTT broker")

if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║  Fake MQTT Telemetry Publisher - Brick Counter Devices  ║
    ║  Simulates real-time device telemetry data              ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    main()
