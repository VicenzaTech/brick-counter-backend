"""
Configuration for brick production service
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Service identification
SERVICE_NAME = "brick_production_service"
SERVICE_VERSION = "1.0.0"

# Database tables
INPUT_TABLE = "measurements"
OUTPUT_TABLE = "brick_production_stats"
LOG_TABLE = "processing_logs"

# Sensor configuration
SENSOR_TYPE = "brick_counter"

# Processing configuration
BATCH_SIZE = int(os.getenv('BRICK_PRODUCTION_BATCH_SIZE', 1000))
MIN_DATA_POINTS = 2  # Minimum data points required for analysis

# Time windows for analytics (in minutes)
ROLLING_WINDOW_SIZE = 60  # 1 hour rolling window
ANOMALY_DETECTION_WINDOW = 24 * 60  # 24 hours for anomaly detection baseline

# Quality thresholds
MIN_DATA_QUALITY_SCORE = 0.7  # Minimum acceptable data quality score
MAX_ERROR_RATE = 0.05  # Maximum acceptable error rate (5%)

# Anomaly detection parameters
ANOMALY_THRESHOLD_STD = 3.0  # Number of standard deviations for anomaly
ANOMALY_MIN_SAMPLES = 10  # Minimum samples needed for anomaly detection

# Performance thresholds
MIN_SPEED_THRESHOLD = 10  # bricks per hour (minimum to consider active)
MAX_DOWNTIME_SECONDS = 300  # 5 minutes max gap considered as downtime

# Logging configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = f"logs/{SERVICE_NAME}.log"
