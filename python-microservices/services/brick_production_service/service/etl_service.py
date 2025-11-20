"""
ETL Service for extracting, transforming, and loading production data
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from shared.models import Measurement
from shared.utils import get_logger, safe_get, extract_sensor_data
from services.brick_production_service.schemas import MeasurementInput, BrickCounterData
from services.brick_production_service.config import MIN_DATA_POINTS

logger = get_logger(__name__)


class ETLService:
    """
    ETL Service for processing raw measurements into structured data.
    Handles extraction, transformation, and validation of sensor data.
    """
    
    def __init__(self):
        """Initialize ETL service"""
        pass
    
    def extract_measurements(
        self,
        raw_measurements: List[Measurement]
    ) -> List[MeasurementInput]:
        """
        Extract and validate measurements from database models.
        
        Args:
            raw_measurements: List of SQLAlchemy Measurement models
            
        Returns:
            List[MeasurementInput]: List of validated measurement inputs
        """
        validated_measurements = []
        errors = 0
        
        for measurement in raw_measurements:
            try:
                # Convert SQLAlchemy model to Pydantic schema for validation
                validated = MeasurementInput.model_validate(measurement)
                validated_measurements.append(validated)
            except Exception as e:
                errors += 1
                logger.warning(
                    "Failed to validate measurement",
                    measurement_id=measurement.id,
                    error=str(e)
                )
        
        if errors > 0:
            logger.warning(
                "Measurement validation completed with errors",
                total=len(raw_measurements),
                valid=len(validated_measurements),
                errors=errors
            )
        
        return validated_measurements
    
    def transform_to_time_series(
        self,
        measurements: List[MeasurementInput]
    ) -> List[Dict[str, Any]]:
        """
        Transform measurements into time series data points.
        
        Args:
            measurements: List of validated measurements
            
        Returns:
            List[Dict]: List of time series data points with:
                - timestamp: datetime
                - count: int
                - error_count: int
                - rssi: Optional[int]
                - battery: Optional[int]
                - temperature: Optional[float]
        """
        time_series = []
        
        for measurement in measurements:
            try:
                brick_data = measurement.get_brick_counter_data()
                
                data_point = {
                    'timestamp': measurement.timestamp,
                    'count': brick_data.count,
                    'error_count': brick_data.error,
                    'rssi': brick_data.rssi,
                    'battery': brick_data.battery,
                    'temperature': brick_data.temperature,
                    'uptime': brick_data.uptime
                }
                
                time_series.append(data_point)
            
            except Exception as e:
                logger.warning(
                    "Failed to transform measurement",
                    measurement_id=measurement.id,
                    error=str(e)
                )
        
        # Sort by timestamp
        time_series.sort(key=lambda x: x['timestamp'])
        
        return time_series
    
    def detect_gaps(
        self,
        time_series: List[Dict[str, Any]],
        max_gap_seconds: int = 300
    ) -> List[Tuple[datetime, datetime, int]]:
        """
        Detect time gaps in data (potential downtime).
        
        Args:
            time_series: List of time series data points
            max_gap_seconds: Maximum acceptable gap in seconds
            
        Returns:
            List[Tuple]: List of gaps as (start_time, end_time, duration_seconds)
        """
        if len(time_series) < 2:
            return []
        
        gaps = []
        
        for i in range(1, len(time_series)):
            prev_ts = time_series[i-1]['timestamp']
            curr_ts = time_series[i]['timestamp']
            
            gap_seconds = (curr_ts - prev_ts).total_seconds()
            
            if gap_seconds > max_gap_seconds:
                gaps.append((prev_ts, curr_ts, int(gap_seconds)))
        
        if gaps:
            logger.info(
                "Detected time gaps",
                gap_count=len(gaps),
                total_downtime=sum(g[2] for g in gaps)
            )
        
        return gaps
    
    def calculate_increments(
        self,
        time_series: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Calculate incremental values between consecutive measurements.
        
        Args:
            time_series: List of time series data points
            
        Returns:
            List[Dict]: Enhanced time series with incremental values:
                - count_increment: Change in count since previous measurement
                - error_increment: Change in errors since previous measurement
                - time_delta_seconds: Time elapsed since previous measurement
        """
        if len(time_series) < 2:
            return time_series
        
        enhanced_series = []
        
        for i in range(len(time_series)):
            point = time_series[i].copy()
            
            if i > 0:
                prev_point = time_series[i-1]
                
                # Calculate increments
                point['count_increment'] = max(0, point['count'] - prev_point['count'])
                point['error_increment'] = max(0, point['error_count'] - prev_point['error_count'])
                
                # Calculate time delta
                time_delta = (point['timestamp'] - prev_point['timestamp']).total_seconds()
                point['time_delta_seconds'] = time_delta
                
                # Calculate speed (bricks per hour)
                if time_delta > 0:
                    point['speed'] = (point['count_increment'] / time_delta) * 3600
                else:
                    point['speed'] = 0.0
            else:
                # First point has no previous reference
                point['count_increment'] = 0
                point['error_increment'] = 0
                point['time_delta_seconds'] = 0
                point['speed'] = 0.0
            
            enhanced_series.append(point)
        
        return enhanced_series
    
    def assess_data_quality(
        self,
        time_series: List[Dict[str, Any]],
        expected_interval_seconds: int = 60
    ) -> float:
        """
        Assess overall data quality based on completeness and consistency.
        
        Args:
            time_series: List of time series data points
            expected_interval_seconds: Expected time between measurements
            
        Returns:
            float: Quality score between 0 and 1
        """
        if len(time_series) < MIN_DATA_POINTS:
            return 0.0
        
        # Check data completeness
        total_points = len(time_series)
        complete_points = sum(
            1 for point in time_series
            if point.get('count') is not None
        )
        completeness_score = complete_points / total_points
        
        # Check time interval consistency
        if len(time_series) >= 2:
            intervals = []
            for i in range(1, len(time_series)):
                interval = (time_series[i]['timestamp'] - time_series[i-1]['timestamp']).total_seconds()
                intervals.append(interval)
            
            avg_interval = sum(intervals) / len(intervals)
            interval_deviation = abs(avg_interval - expected_interval_seconds) / expected_interval_seconds
            consistency_score = max(0, 1 - interval_deviation)
        else:
            consistency_score = 1.0
        
        # Overall quality score (weighted average)
        quality_score = (completeness_score * 0.7) + (consistency_score * 0.3)
        
        return round(quality_score, 3)
    
    def extract_metadata(
        self,
        measurements: List[MeasurementInput],
        time_series: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Extract metadata from measurements for context.
        
        Args:
            measurements: List of validated measurements
            time_series: Processed time series data
            
        Returns:
            Dict: Metadata including production line, position, brick type, etc.
        """
        if not measurements:
            return {}
        
        # Extract from first measurement's metadata
        first_measurement = measurements[0]
        metadata = first_measurement.metadata or {}
        
        return {
            'production_line': safe_get(metadata, 'production_line'),
            'position': safe_get(metadata, 'position'),
            'brick_type': safe_get(metadata, 'brick_type'),
            'data_points': len(time_series),
            'measurement_count': len(measurements)
        }
