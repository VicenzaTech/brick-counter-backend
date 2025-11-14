#!/usr/bin/env python3
"""
MQTT Test Publisher
Gửi test messages đến MQTT broker để kiểm tra backend
"""

import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime

# MQTT Configuration
MQTT_HOST = "192.168.221.4"
MQTT_PORT = 1883
MQTT_USERNAME = ""
MQTT_PASSWORD = ""

# Test devices
DEVICES = [
    "device_001",
    "device_002", 
    "device_003",
]

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
    else:
        print(f"❌ Failed to connect, return code {rc}")

def on_publish(client, userdata, mid):
    print(f"📤 Message {mid} published")

def send_telemetry(client, device_id, count_base=0):
    """Send telemetry message"""
    topic = f"devices/{device_id}/telemetry"
    
    payload = {
        "deviceId": device_id,
        "ts": datetime.now().isoformat(),
        "metrics": {
            "count": count_base + random.randint(0, 100),
            "err_count": random.randint(0, 5)
        },
        "quality": {
            "rssi": -50 - random.randint(0, 30)
        }
    }
    
    print(f"\n{'='*70}")
    print(f"📊 Sending TELEMETRY to {topic}")
    print(f"   Device: {device_id}")
    print(f"   Count: {payload['metrics']['count']}")
    print(f"   Err Count: {payload['metrics']['err_count']}")
    print(f"   RSSI: {payload['quality']['rssi']} dBm")
    print(f"   Timestamp: {payload['ts']}")
    print(f"{'='*70}")
    
    result = client.publish(topic, json.dumps(payload), qos=1)
    return result.rc == mqtt.MQTT_ERR_SUCCESS

def send_health(client, device_id):
    """Send health message"""
    topic = f"devices/{device_id}/health"
    
    statuses = ["online", "warning", "error"]
    payload = {
        "deviceId": device_id,
        "ts": datetime.now().isoformat(),
        "status": random.choice(statuses),
        "battery": random.randint(20, 100),
        "temperature": random.randint(20, 45),
        "uptime": random.randint(0, 86400)
    }
    
    print(f"\n{'='*70}")
    print(f"🏥 Sending HEALTH to {topic}")
    print(f"   Device: {device_id}")
    print(f"   Status: {payload['status']}")
    print(f"   Battery: {payload['battery']}%")
    print(f"   Temperature: {payload['temperature']}°C")
    print(f"   Uptime: {payload['uptime']}s")
    print(f"   Timestamp: {payload['ts']}")
    print(f"{'='*70}")
    
    result = client.publish(topic, json.dumps(payload), qos=1)
    return result.rc == mqtt.MQTT_ERR_SUCCESS

def main():
    print("🚀 Starting MQTT Test Publisher...")
    print(f"🌐 Connecting to {MQTT_HOST}:{MQTT_PORT}")
    
    # Create MQTT client
    client = mqtt.Client(client_id=f"test_publisher_{random.randint(1000, 9999)}")
    
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    client.on_connect = on_connect
    client.on_publish = on_publish
    
    # Connect to broker
    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_start()
        time.sleep(2)  # Wait for connection
        
        print("\n" + "="*70)
        print("📡 Starting to send test messages...")
        print("   Press Ctrl+C to stop")
        print("="*70 + "\n")
        
        count_base = 0
        iteration = 1
        
        while True:
            print(f"\n🔄 Iteration {iteration}")
            print("-" * 70)
            
            for device_id in DEVICES:
                # Send telemetry
                if send_telemetry(client, device_id, count_base):
                    print(f"✅ Telemetry sent for {device_id}")
                else:
                    print(f"❌ Failed to send telemetry for {device_id}")
                
                time.sleep(0.5)  # Small delay between messages
                
                # Send health every 5 iterations
                if iteration % 5 == 0:
                    if send_health(client, device_id):
                        print(f"✅ Health sent for {device_id}")
                    else:
                        print(f"❌ Failed to send health for {device_id}")
                    
                    time.sleep(0.5)
            
            count_base += 10
            iteration += 1
            
            print(f"\n⏰ Waiting 2 seconds before next iteration...")
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping publisher...")
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()
        print("👋 Disconnected from MQTT broker")

if __name__ == "__main__":
    main()
