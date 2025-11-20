"""
Timestamp utilities for consistent datetime handling
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from dateutil import parser


def parse_iso_timestamp(timestamp_str: str) -> datetime:
    """
    Parse ISO format timestamp string to datetime object.
    
    Args:
        timestamp_str: ISO format timestamp (e.g., '2025-11-20T14:30:00Z')
        
    Returns:
        datetime: Parsed datetime object with UTC timezone
        
    Examples:
        >>> parse_iso_timestamp('2025-11-20T14:30:00Z')
        datetime.datetime(2025, 11, 20, 14, 30, tzinfo=datetime.timezone.utc)
    """
    dt = parser.isoparse(timestamp_str)
    
    # Ensure timezone aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    return dt


def format_timestamp(dt: datetime, format_str: str = '%Y-%m-%d %H:%M:%S') -> str:
    """
    Format datetime object to string.
    
    Args:
        dt: Datetime object to format
        format_str: Format string (default: '%Y-%m-%d %H:%M:%S')
        
    Returns:
        str: Formatted timestamp string
        
    Examples:
        >>> dt = datetime(2025, 11, 20, 14, 30)
        >>> format_timestamp(dt)
        '2025-11-20 14:30:00'
    """
    return dt.strftime(format_str)


def get_time_range(
    date: Optional[datetime] = None,
    hours: int = 24
) -> Tuple[datetime, datetime]:
    """
    Get time range for a specific period.
    
    Args:
        date: Reference date (default: now)
        hours: Number of hours to look back (default: 24)
        
    Returns:
        Tuple[datetime, datetime]: (start_time, end_time)
        
    Examples:
        >>> start, end = get_time_range(hours=24)
        >>> (end - start).total_seconds() / 3600
        24.0
    """
    if date is None:
        date = datetime.now(timezone.utc)
    
    end_time = date
    start_time = date - timedelta(hours=hours)
    
    return start_time, end_time


def get_current_utc() -> datetime:
    """
    Get current UTC datetime.
    
    Returns:
        datetime: Current UTC datetime with timezone info
        
    Examples:
        >>> now = get_current_utc()
        >>> now.tzinfo == timezone.utc
        True
    """
    return datetime.now(timezone.utc)


def get_date_range(start_date: datetime, end_date: datetime) -> list[datetime]:
    """
    Get list of dates between start and end (inclusive).
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        list[datetime]: List of dates
        
    Examples:
        >>> start = datetime(2025, 11, 18)
        >>> end = datetime(2025, 11, 20)
        >>> dates = get_date_range(start, end)
        >>> len(dates)
        3
    """
    dates = []
    current = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    while current <= end:
        dates.append(current)
        current += timedelta(days=1)
    
    return dates


def round_to_interval(dt: datetime, minutes: int = 5) -> datetime:
    """
    Round datetime to nearest interval.
    
    Args:
        dt: Datetime to round
        minutes: Interval in minutes (default: 5)
        
    Returns:
        datetime: Rounded datetime
        
    Examples:
        >>> dt = datetime(2025, 11, 20, 14, 33, 45)
        >>> round_to_interval(dt, minutes=5)
        datetime.datetime(2025, 11, 20, 14, 35, 0)
    """
    rounded_minute = (dt.minute // minutes) * minutes
    return dt.replace(minute=rounded_minute, second=0, microsecond=0)


def get_shift_info(dt: datetime) -> dict:
    """
    Get shift information for a given datetime.
    
    Args:
        dt: Datetime to check
        
    Returns:
        dict: Shift information with keys:
            - shift_type: 'day' or 'night'
            - shift_date: Date of shift
            - shift_start: Shift start time
            - shift_end: Shift end time
            
    Examples:
        >>> dt = datetime(2025, 11, 20, 10, 0)
        >>> info = get_shift_info(dt)
        >>> info['shift_type']
        'day'
    """
    hour = dt.hour
    
    if 6 <= hour < 18:
        shift_type = 'day'
        shift_start = dt.replace(hour=6, minute=0, second=0, microsecond=0)
        shift_end = dt.replace(hour=18, minute=0, second=0, microsecond=0)
        shift_date = dt.date()
    else:
        shift_type = 'night'
        if hour >= 18:
            # Night shift starts at 18:00
            shift_start = dt.replace(hour=18, minute=0, second=0, microsecond=0)
            shift_end = (dt + timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0)
            shift_date = dt.date()
        else:
            # Before 6:00 AM, belongs to previous night shift
            shift_start = (dt - timedelta(days=1)).replace(hour=18, minute=0, second=0, microsecond=0)
            shift_end = dt.replace(hour=6, minute=0, second=0, microsecond=0)
            shift_date = (dt - timedelta(days=1)).date()
    
    return {
        'shift_type': shift_type,
        'shift_date': shift_date,
        'shift_start': shift_start,
        'shift_end': shift_end
    }
