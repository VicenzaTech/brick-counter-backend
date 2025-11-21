"""
Input schemas for validating raw measurement data
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class BrickCounterData(BaseModel):
    """
    Schema for brick counter sensor data from JSONB field.
    """
    count: int = Field(..., ge=0, description="Cumulative brick count")
    error: int = Field(default=0, ge=0, description="Error count", alias="errCount")
    rssi: Optional[int] = Field(None, description="Signal strength (dBm)")
    battery: Optional[int] = Field(None, ge=0, le=100, description="Battery percentage")
    temperature: Optional[float] = Field(None, description="Device temperature (°C)")
    uptime: Optional[int] = Field(None, ge=0, description="Device uptime (seconds)")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "count": 1234,
                "error": 5,
                "rssi": -45,
                "battery": 85,
                "temperature": 25.5,
                "uptime": 86400
            }
        }


class MeasurementInput(BaseModel):
    """
    Schema for validating raw measurement records from database.
    """
    id: int
    device_id: str = Field(..., min_length=1, description="Device identifier")
    sensor_type: str = Field(..., description="Type of sensor")
    timestamp: datetime = Field(..., description="Measurement timestamp")
    data: Dict[str, Any] = Field(..., description="Raw sensor data (JSONB)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    @validator('device_id')
    def normalize_device_id(cls, v):
        """Normalize device ID to uppercase"""
        return v.upper().strip()
    
    @validator('sensor_type')
    def validate_sensor_type(cls, v):
        """Validate sensor type"""
        allowed_types = ['brick_counter', 'moisture', 'temperature', 'machine_monitoring']
        if v not in allowed_types:
            raise ValueError(f"Invalid sensor_type. Must be one of {allowed_types}")
        return v
    
    def get_brick_counter_data(self) -> BrickCounterData:
        """
        Extract and validate brick counter data from JSONB field.
        
        Returns:
            BrickCounterData: Validated brick counter data
            
        Raises:
            ValueError: If data is invalid or missing required fields
        """
        try:
            return BrickCounterData(**self.data)
        except Exception as e:
            raise ValueError(f"Invalid brick counter data: {e}")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 12345,
                "device_id": "SAU-ME-01",
                "sensor_type": "brick_counter",
                "timestamp": "2025-11-20T14:30:00Z",
                "data": {
                    "count": 1234,
                    "error": 5,
                    "rssi": -45,
                    "battery": 85
                },
                "metadata": {
                    "production_line": "DC-01",
                    "position": "SAU-ME"
                }
            }
        }
