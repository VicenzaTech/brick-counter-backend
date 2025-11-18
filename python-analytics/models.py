"""
Data models for analytics
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List


@dataclass
class LogEntry:
    """Single log entry from device file"""
    timestamp: datetime
    count: int
    device_id: str
    production_line: str
    position: str


@dataclass
class DeviceMetrics:
    """Calculated metrics for a device"""
    device_id: str
    production_line: str
    position: str
    
    # Current state
    current_count: int
    last_update: datetime
    
    # Speed metrics (viên/phút, viên/giờ)
    speed_per_minute: float
    speed_per_hour: float
    
    # Production metrics
    total_produced_today: int
    total_produced_last_hour: int
    total_produced_last_10min: int
    
    # Status
    is_running: bool
    idle_time_seconds: float  # Thời gian không hoạt động
    uptime_seconds: float     # Thời gian chạy liên tục
    
    # Trend
    trend: str  # 'increasing', 'stable', 'decreasing', 'stopped'
    
    # Performance
    efficiency_percent: Optional[float] = None  # So với target nếu có
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'deviceId': self.device_id,
            'productionLine': self.production_line,
            'position': self.position,
            'currentCount': self.current_count,
            'lastUpdate': self.last_update.isoformat(),
            'speedPerMinute': round(self.speed_per_minute, 2),
            'speedPerHour': round(self.speed_per_hour, 2),
            'totalProducedToday': self.total_produced_today,
            'totalProducedLastHour': self.total_produced_last_hour,
            'totalProducedLast10Min': self.total_produced_last_10min,
            'isRunning': self.is_running,
            'idleTimeSeconds': round(self.idle_time_seconds, 2),
            'uptimeSeconds': round(self.uptime_seconds, 2),
            'trend': self.trend,
            'efficiencyPercent': round(self.efficiency_percent, 2) if self.efficiency_percent else None,
        }


@dataclass
class LineMetrics:
    """Aggregated metrics for entire production line"""
    production_line: str
    total_devices: int
    running_devices: int
    stopped_devices: int
    
    total_produced_today: int
    average_speed_per_hour: float
    
    devices: List[DeviceMetrics]
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'productionLine': self.production_line,
            'totalDevices': self.total_devices,
            'runningDevices': self.running_devices,
            'stoppedDevices': self.stopped_devices,
            'totalProducedToday': self.total_produced_today,
            'averageSpeedPerHour': round(self.average_speed_per_hour, 2),
            'devices': [d.to_dict() for d in self.devices],
        }
