"""
Configuration for Python Analytics Service
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Paths
BASE_DIR = Path(__file__).parent
LOG_DIR = Path(os.getenv('LOG_DIR', '../tile-production-management/logs'))

# Redis
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

# MQTT
MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))

# PostgreSQL
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 5450))
DB_NAME = os.getenv('DB_NAME', 'brick-counter-dev')
DB_USER = os.getenv('DB_USER', 'admin')
DB_PASSWORD = os.getenv('DB_PASSWORD', '123456')

# Analytics Settings
CALCULATION_INTERVAL = int(os.getenv('CALCULATION_INTERVAL', 10))  # seconds
HISTORY_WINDOW = int(os.getenv('HISTORY_WINDOW', 3600))  # seconds

# Device mapping (position name -> display name)
DEVICE_POSITIONS = {
    'sau-me': 'Sau máy ép',
    'truoc-ln': 'Trước lò nung',
    'sau-ln': 'Sau lò nung',
    'truoc-mm': 'Trước mài mặt',
    'sau-mc': 'Sau mài cạnh',
    'truoc-dh': 'Trước đóng hộp',
}
