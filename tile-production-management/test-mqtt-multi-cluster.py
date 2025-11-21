#!/usr/bin/env python3
"""
MQTT Test Publisher - Multi-Cluster
Test script để publish MQTT messages cho các clusters khác nhau
"""

import json
import time
from datetime import datetime
import paho.mqtt.client as mqtt
import random

# MQTT Broker config
MQTT_BROKER = "192.168.221.4"
MQTT_PORT = 1883
MQTT_USERNAME = ""
MQTT_PASSWORD = ""

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ Connected to MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    else:
        print(f"❌ Failed to connect, return code {rc}")

def on_publish(client, userdata, mid):
    print(f"   Published message ID: {mid}")

# Tạo MQTT client
client = mqtt.Client(client_id=f"test_publisher_{random.randint(1000, 9999)}")
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
client.on_connect = on_connect
client.on_publish = on_publish

# Connect
print(f"🔌 Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_start()

time.sleep(2)  # Wait for connection

def publish_brick_counter_telemetry(device_id: str, count: int, error: int = 0):
    """Publish brick counter telemetry"""
    topic = f"devices/BR/{device_id}/telemetry"
    
    payload = {
        "device_id": device_id,
        "cluster_code": "BR",
        "type_code": "brick_count",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "count": count,
            "error": error,
            "rssi": random.randint(-80, -40),
            "battery": random.randint(70, 100),
            "temperature": round(random.uniform(20, 30), 1)
        }
    }
    
    result = client.publish(topic, json.dumps(payload), qos=1)
    print(f"📨 Published to {topic}")
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    return result

def publish_temperature_telemetry(device_id: str, temperature: float):
    """Publish temperature sensor telemetry"""
    topic = f"devices/TEMP/{device_id}/telemetry"
    
    payload = {
        "device_id": device_id,
        "cluster_code": "TEMP",
        "type_code": "temperature",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "temperature": temperature,
            "humidity": round(random.uniform(40, 80), 1),
            "heat_index": round(temperature + random.uniform(0, 5), 1),
            "rssi": random.randint(-80, -40),
            "battery": random.randint(70, 100)
        }
    }
    
    result = client.publish(topic, json.dumps(payload), qos=1)
    print(f"📨 Published to {topic}")
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    return result

def publish_humidity_telemetry(device_id: str, humidity: float):
    """Publish humidity sensor telemetry"""
    topic = f"devices/HM/{device_id}/telemetry"
    
    payload = {
        "device_id": device_id,
        "cluster_code": "HM",
        "type_code": "humidity",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "humidity": humidity,
            "temperature": round(random.uniform(20, 30), 1),
            "dew_point": round(humidity * 0.3, 1),
            "rssi": random.randint(-80, -40),
            "battery": random.randint(70, 100)
        }
    }
    
    result = client.publish(topic, json.dumps(payload), qos=1)
    print(f"📨 Published to {topic}")
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    return result

def publish_device_status(cluster_code: str, device_id: str, status: str):
    """Publish device status"""
    topic = f"devices/{cluster_code}/{device_id}/status"
    
    payload = {
        "device_id": device_id,
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "details": {
            "uptime": random.randint(1000, 10000),
            "memory_free": random.randint(1000, 5000)
        }
    }
    
    result = client.publish(topic, json.dumps(payload), qos=1)
    print(f"📨 Published status to {topic}: {status}")
    return result

# Test scenarios
print("\n" + "="*80)
print("🧪 MQTT Multi-Cluster Test Publisher")
print("="*80 + "\n")

try:
    # Test 1: Brick Counter
    print("\n📊 Test 1: Brick Counter Telemetry")
    print("-" * 50)
    for i in range(3):
        count = 1000 + (i * 10)
        publish_brick_counter_telemetry("SAU-ME-01", count, random.randint(0, 5))
        time.sleep(1)
    
    # Test 2: Temperature Sensor
    print("\n🌡️ Test 2: Temperature Sensor Telemetry")
    print("-" * 50)
    for i in range(3):
        temp = 25.0 + (i * 0.5)
        publish_temperature_telemetry("TEMP-ZONE-01", temp)
        time.sleep(1)
    
    # Test 3: Humidity Sensor
    print("\n💧 Test 3: Humidity Sensor Telemetry")
    print("-" * 50)
    for i in range(3):
        humidity = 60.0 + (i * 2)
        publish_humidity_telemetry("HM-ROOM-01", humidity)
        time.sleep(1)
    
    # Test 4: Device Status Updates
    print("\n🔔 Test 4: Device Status Updates")
    print("-" * 50)
    publish_device_status("BR", "SAU-ME-01", "online")
    time.sleep(1)
    publish_device_status("TEMP", "TEMP-ZONE-01", "online")
    time.sleep(1)
    publish_device_status("HM", "HM-ROOM-01", "online")
    time.sleep(1)
    
    # Test 5: Rapid Fire (stress test)
    print("\n🚀 Test 5: Rapid Fire (10 messages)")
    print("-" * 50)
    for i in range(10):
        cluster = random.choice(["BR", "TEMP", "HM"])
        if cluster == "BR":
            publish_brick_counter_telemetry("SAU-ME-01", 1000 + i, 0)
        elif cluster == "TEMP":
            publish_temperature_telemetry("TEMP-ZONE-01", 25.0 + i)
        else:
            publish_humidity_telemetry("HM-ROOM-01", 60.0 + i)
        time.sleep(0.5)
    
    print("\n✅ All tests completed successfully!")
    
except KeyboardInterrupt:
    print("\n⚠️ Interrupted by user")
except Exception as e:
    print(f"\n❌ Error: {e}")
finally:
    print("\n🔌 Disconnecting...")
    client.loop_stop()
    client.disconnect()
    print("✅ Disconnected")
