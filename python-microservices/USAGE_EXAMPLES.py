"""
Usage examples for Python microservices
"""

# ============================================================================
# Example 1: Process single device for today
# ============================================================================

from datetime import datetime, timedelta
from services.brick_production_service.main import BrickProductionProcessor

# Initialize processor
processor = BrickProductionProcessor()

# Process last 12 hours
end_time = datetime.now()
start_time = end_time - timedelta(hours=12)

result = processor.process_device(
    device_id='SAU-ME-01',
    start_time=start_time,
    end_time=end_time
)

if result:
    print(f"✅ Processed {result.count_increment} bricks")
    print(f"   Speed: {result.avg_speed:.1f} bricks/hour")
    print(f"   Error rate: {result.error_rate:.2%}")


# ============================================================================
# Example 2: Process specific date range
# ============================================================================

from datetime import datetime

processor = BrickProductionProcessor()

result = processor.process_device(
    device_id='SAU-ME-01',
    start_time=datetime(2025, 11, 20, 6, 0),   # Day shift start
    end_time=datetime(2025, 11, 20, 18, 0)     # Day shift end
)


# ============================================================================
# Example 3: Batch process multiple devices
# ============================================================================

processor = BrickProductionProcessor()

devices = ['SAU-ME-01', 'SAU-ME-02', 'TRUOC-LN-01', 'SAU-LN-01']

results = processor.process_multiple_devices(
    device_ids=devices,
    start_time=datetime(2025, 11, 20, 0, 0),
    end_time=datetime(2025, 11, 20, 23, 59)
)

print(f"Success: {results['success']}/{results['total']}")
print(f"Failed: {results['failed']}/{results['total']}")


# ============================================================================
# Example 4: Command line usage
# ============================================================================

"""
# Process single device for today
python -m services.brick_production_service.main \
    --device-id SAU-ME-01 \
    --hours 12

# Process specific date
python -m services.brick_production_service.main \
    --device-id SAU-ME-01 \
    --date 2025-11-20

# Process specific time range
python -m services.brick_production_service.main \
    --device-id SAU-ME-01 \
    --start-time "2025-11-20T06:00:00" \
    --end-time "2025-11-20T18:00:00"
"""


# ============================================================================
# Example 5: Direct repository usage (advanced)
# ============================================================================

from shared.database import get_db_session
from services.brick_production_service.repository import MeasurementRepository

with get_db_session() as session:
    repo = MeasurementRepository(session)
    
    # Get latest measurement
    latest = repo.get_latest_measurement(
        device_id='SAU-ME-01',
        sensor_type='brick_counter'
    )
    
    if latest:
        print(f"Latest count: {latest.data['count']}")
        print(f"Timestamp: {latest.timestamp}")
    
    # Count measurements in range
    count = repo.get_measurement_count(
        device_id='SAU-ME-01',
        start_time=datetime(2025, 11, 20, 0, 0),
        end_time=datetime(2025, 11, 20, 23, 59)
    )
    
    print(f"Total measurements: {count}")


# ============================================================================
# Example 6: Custom analytics
# ============================================================================

from services.brick_production_service.analytics import TimeSeriesAnalyzer, AnomalyDetector
from services.brick_production_service.service import ETLService

# Load and transform data
processor = BrickProductionProcessor()
etl = ETLService()

# ... load measurements ...
time_series = etl.transform_to_time_series(measurements)
enhanced = etl.calculate_increments(time_series)

# Analyze time series
analyzer = TimeSeriesAnalyzer(window_size_minutes=30)
rolling_avg = analyzer.rolling_average(enhanced, field='count')
trend = analyzer.detect_trend(enhanced, field='count')

print(f"Trend: {trend}")

# Detect anomalies
detector = AnomalyDetector(threshold_std=3.0)
anomalies = detector.comprehensive_analysis(enhanced, metrics)

if anomalies['is_anomaly']:
    print(f"⚠️ Anomaly detected: {anomalies['anomaly_reason']}")


# ============================================================================
# Example 7: Scheduled processing (cron job)
# ============================================================================

"""
# Add to crontab for hourly processing
0 * * * * cd /path/to/project && python -m services.brick_production_service.main --device-id SAU-ME-01 --hours 1

# Process all devices daily at 1 AM
0 1 * * * cd /path/to/project && python scripts/process_all_devices.py
"""


# ============================================================================
# Example 8: Integration with existing log files
# ============================================================================

"""
If you have existing log files and want to import to measurements table:

1. Create a migration script to read log files
2. Parse log entries into measurements
3. Bulk insert into database
4. Then run processing service

See: scripts/import_log_files.py (to be created)
"""


# ============================================================================
# Example 9: Error handling
# ============================================================================

from shared.utils import get_logger

logger = get_logger(__name__)

try:
    processor = BrickProductionProcessor()
    result = processor.process_device(
        device_id='SAU-ME-01',
        start_time=start_time,
        end_time=end_time
    )
    
    if result:
        logger.info("Processing successful", device_id='SAU-ME-01')
    else:
        logger.warning("No data to process", device_id='SAU-ME-01')

except Exception as e:
    logger.error("Processing failed", error=str(e), exc_info=True)
    # Handle error (retry, alert, etc.)


# ============================================================================
# Example 10: Testing with mock data
# ============================================================================

"""
For testing without real database:

1. Create mock measurements in test fixtures
2. Use pytest with database fixtures
3. Test each layer independently

See: tests/services/brick_production_service/
"""

import pytest
from services.brick_production_service.service import ETLService

def test_etl_transform():
    etl = ETLService()
    
    # Mock data
    mock_measurements = [...]
    
    time_series = etl.transform_to_time_series(mock_measurements)
    
    assert len(time_series) == len(mock_measurements)
    assert time_series[0]['count'] >= 0
