"""
JSON parsing and validation utilities
"""
from typing import Any, Optional, Dict
import json


def safe_get(data: Dict[str, Any], key: str, default: Any = None) -> Any:
    """
    Safely get value from dictionary with default fallback.
    
    Args:
        data: Dictionary to get value from
        key: Key to retrieve (supports dot notation for nested keys)
        default: Default value if key not found
        
    Returns:
        Any: Value from dictionary or default
        
    Examples:
        >>> data = {'sensor': {'temperature': 25.5}}
        >>> safe_get(data, 'sensor.temperature')
        25.5
        >>> safe_get(data, 'sensor.humidity', 0)
        0
    """
    try:
        keys = key.split('.')
        value = data
        
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return default
        
        return value if value is not None else default
    except (KeyError, TypeError, AttributeError):
        return default


def parse_jsonb_field(jsonb_str: str) -> Optional[Dict[str, Any]]:
    """
    Parse JSONB string from PostgreSQL to Python dict.
    
    Args:
        jsonb_str: JSONB string from database
        
    Returns:
        Optional[Dict]: Parsed dictionary or None if invalid
        
    Examples:
        >>> parse_jsonb_field('{"count": 100, "error": 0}')
        {'count': 100, 'error': 0}
    """
    if not jsonb_str:
        return None
    
    try:
        if isinstance(jsonb_str, dict):
            return jsonb_str
        
        return json.loads(jsonb_str)
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Failed to parse JSONB: {e}")
        return None


def validate_json_schema(data: Dict[str, Any], required_fields: list[str]) -> tuple[bool, Optional[str]]:
    """
    Validate JSON data against required fields.
    
    Args:
        data: JSON data to validate
        required_fields: List of required field names (supports dot notation)
        
    Returns:
        tuple[bool, Optional[str]]: (is_valid, error_message)
        
    Examples:
        >>> data = {'sensor': {'count': 100}}
        >>> validate_json_schema(data, ['sensor.count'])
        (True, None)
        >>> validate_json_schema(data, ['sensor.humidity'])
        (False, 'Missing required field: sensor.humidity')
    """
    for field in required_fields:
        value = safe_get(data, field)
        if value is None:
            return False, f"Missing required field: {field}"
    
    return True, None


def extract_sensor_data(jsonb_data: Dict[str, Any], sensor_type: str) -> Dict[str, Any]:
    """
    Extract sensor-specific data from JSONB field.
    
    Args:
        jsonb_data: Raw JSONB data from measurements table
        sensor_type: Type of sensor ('brick_counter', 'moisture', etc.)
        
    Returns:
        Dict[str, Any]: Extracted sensor data
        
    Examples:
        >>> data = {'count': 100, 'error': 0, 'rssi': -45}
        >>> extract_sensor_data(data, 'brick_counter')
        {'count': 100, 'error_count': 0, 'rssi': -45}
    """
    if sensor_type == 'brick_counter':
        return {
            'count': safe_get(jsonb_data, 'count', 0),
            'error_count': safe_get(jsonb_data, 'error', 0),
            'rssi': safe_get(jsonb_data, 'rssi'),
            'battery': safe_get(jsonb_data, 'battery'),
            'temperature': safe_get(jsonb_data, 'temperature'),
        }
    
    elif sensor_type == 'moisture':
        return {
            'moisture_level': safe_get(jsonb_data, 'moisture', 0.0),
            'temperature': safe_get(jsonb_data, 'temperature'),
            'humidity': safe_get(jsonb_data, 'humidity'),
        }
    
    elif sensor_type == 'machine_monitoring':
        return {
            'temperature': safe_get(jsonb_data, 'temperature', 0.0),
            'vibration': safe_get(jsonb_data, 'vibration', 0.0),
            'pressure': safe_get(jsonb_data, 'pressure'),
            'rpm': safe_get(jsonb_data, 'rpm'),
            'status': safe_get(jsonb_data, 'status', 'unknown'),
        }
    
    else:
        # Return raw data for unknown sensor types
        return jsonb_data


def normalize_device_id(device_id: str) -> str:
    """
    Normalize device ID to uppercase format.
    
    Args:
        device_id: Raw device ID
        
    Returns:
        str: Normalized device ID
        
    Examples:
        >>> normalize_device_id('sau-me-01')
        'SAU-ME-01'
        >>> normalize_device_id('Truoc-LN-02')
        'TRUOC-LN-02'
    """
    return device_id.upper().strip()


def parse_device_metadata(device_id: str) -> Dict[str, str]:
    """
    Parse device ID to extract metadata.
    
    Args:
        device_id: Device ID (e.g., 'SAU-ME-01')
        
    Returns:
        Dict[str, str]: Metadata with keys:
            - position: Device position (e.g., 'SAU-ME')
            - number: Device number (e.g., '01')
            
    Examples:
        >>> parse_device_metadata('SAU-ME-01')
        {'position': 'SAU-ME', 'number': '01'}
    """
    parts = device_id.rsplit('-', 1)
    
    if len(parts) == 2:
        return {
            'position': parts[0],
            'number': parts[1]
        }
    
    return {
        'position': device_id,
        'number': '00'
    }
