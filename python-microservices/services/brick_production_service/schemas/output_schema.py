"""
Output schemas for production statistics
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class ProductionStatOutput(BaseModel):
    """
    Schema for production statistics output.
    Validated before saving to brick_production_stats table.
    """
    # Device identification
    device_id: str = Field(..., description="Device identifier")
    production_line: Optional[str] = Field(None, description="Production line")
    position: Optional[str] = Field(None, description="Device position")
    brick_type: Optional[str] = Field(None, description="Type of brick being produced")
    
    # Time range
    start_time: datetime = Field(..., description="Start of measurement period")
    end_time: datetime = Field(..., description="End of measurement period")
    
    # Production metrics
    total_count: int = Field(..., ge=0, description="Total cumulative count at end")
    count_increment: int = Field(..., ge=0, description="New bricks produced in period")
    error_count: int = Field(default=0, ge=0, description="Number of errors")
    error_rate: float = Field(default=0.0, ge=0.0, le=1.0, description="Error rate (0-1)")
    
    # Performance metrics
    avg_speed: Optional[float] = Field(None, ge=0, description="Average production speed (bricks/hour)")
    peak_speed: Optional[float] = Field(None, ge=0, description="Peak production speed (bricks/hour)")
    downtime_seconds: int = Field(default=0, ge=0, description="Total downtime in seconds")
    
    # Statistical metrics
    count_mean: Optional[float] = Field(None, description="Mean count value")
    count_std: Optional[float] = Field(None, ge=0, description="Standard deviation of count")
    count_min: Optional[int] = Field(None, ge=0, description="Minimum count value")
    count_max: Optional[int] = Field(None, ge=0, description="Maximum count value")
    
    # Anomaly detection
    is_anomaly: int = Field(default=0, ge=0, le=1, description="Anomaly flag (0=normal, 1=anomaly)")
    anomaly_score: Optional[float] = Field(None, description="Anomaly score")
    anomaly_reason: Optional[str] = Field(None, description="Reason for anomaly detection")
    
    # Data quality
    data_quality_score: float = Field(default=1.0, ge=0.0, le=1.0, description="Data quality score (0-1)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('error_rate', pre=True, always=True)
    def calculate_error_rate(cls, v, values):
        """Calculate error rate if not provided"""
        if v is None or v == 0:
            count_increment = values.get('count_increment', 0)
            error_count = values.get('error_count', 0)
            if count_increment > 0:
                return error_count / count_increment
        return v
    
    @validator('end_time')
    def validate_time_range(cls, v, values):
        """Validate that end_time is after start_time"""
        start_time = values.get('start_time')
        if start_time and v <= start_time:
            raise ValueError("end_time must be after start_time")
        return v
    
    @validator('avg_speed', 'peak_speed', pre=True, always=True)
    def validate_speed(cls, v):
        """Ensure speed is non-negative"""
        if v is not None and v < 0:
            return 0.0
        return v
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "device_id": "SAU-ME-01",
                "production_line": "DC-01",
                "position": "SAU-ME",
                "brick_type": "300x600mm",
                "start_time": "2025-11-20T06:00:00Z",
                "end_time": "2025-11-20T18:00:00Z",
                "total_count": 15000,
                "count_increment": 1200,
                "error_count": 12,
                "error_rate": 0.01,
                "avg_speed": 100.0,
                "peak_speed": 150.0,
                "downtime_seconds": 300,
                "count_mean": 14400.0,
                "count_std": 250.5,
                "count_min": 13800,
                "count_max": 15000,
                "is_anomaly": 0,
                "anomaly_score": 0.25,
                "data_quality_score": 0.95,
                "metadata": {
                    "processing_version": "1.0.0",
                    "data_points": 1440
                }
            }
        }
