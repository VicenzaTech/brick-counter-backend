"""
Calculate realtime metrics from log entries
"""
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
import numpy as np
from models import LogEntry, DeviceMetrics, LineMetrics
from config import HISTORY_WINDOW


class MetricsCalculator:
    """Calculate various metrics from device logs"""
    
    def __init__(self, history_window: int = HISTORY_WINDOW):
        """
        Args:
            history_window: Time window in seconds to consider for calculations
        """
        self.history_window = history_window
    
    def calculate_device_metrics(self, entries: List[LogEntry], 
                                 target_speed: Optional[float] = None) -> Optional[DeviceMetrics]:
        """
        Calculate metrics for a single device
        
        Args:
            entries: List of log entries (sorted by timestamp)
            target_speed: Target speed in units/hour for efficiency calculation
            
        Returns:
            DeviceMetrics object or None if insufficient data
        """
        if not entries:
            return None
        
        # Sort by timestamp
        entries = sorted(entries, key=lambda x: x.timestamp)
        
        # Chỉ lấy 10 entries gần nhất để tính toán (giảm overhead)
        recent_entries = entries[-10:] if len(entries) > 10 else entries
        
        # Latest entry
        latest = recent_entries[-1]
        current_count = latest.count
        last_update = latest.timestamp
        
        if len(recent_entries) < 2:
            # Not enough data
            now = datetime.now(timezone.utc)
            return DeviceMetrics(
                device_id=latest.device_id,
                production_line=latest.production_line,
                position=latest.position,
                current_count=current_count,
                last_update=last_update,
                speed_per_minute=0.0,
                speed_per_hour=0.0,
                total_produced_today=current_count,
                total_produced_last_hour=0,
                total_produced_last_10min=0,
                is_running=False,
                idle_time_seconds=(now - last_update).total_seconds(),
                uptime_seconds=0.0,
                trend='stopped',
                efficiency_percent=0.0 if target_speed else None,
            )
        
        # Calculate speed (viên/phút)
        first_entry = recent_entries[0]
        time_diff_seconds = (latest.timestamp - first_entry.timestamp).total_seconds()
        count_diff = latest.count - first_entry.count  # Số viên sản xuất được
        
        if time_diff_seconds > 0:
            speed_per_minute = (count_diff / time_diff_seconds) * 60
            speed_per_hour = speed_per_minute * 60
        else:
            speed_per_minute = 0.0
            speed_per_hour = 0.0
        
        # Calculate production from recent entries (số viên thực tế)
        total_last_period = count_diff  # Số viên từ first -> last trong window
        
        # Determine if running (no update in last 60 seconds = stopped)
        now = datetime.now(timezone.utc)
        idle_time = (now - last_update).total_seconds()
        is_running = idle_time < 60
        
        # Calculate uptime (time since last stop)
        uptime = self._calculate_uptime(recent_entries)
        
        # Determine trend
        trend = self._calculate_trend(recent_entries)
        
        # Calculate efficiency if target provided
        efficiency = None
        if target_speed and speed_per_hour > 0:
            efficiency = (speed_per_hour / target_speed) * 100
        
        return DeviceMetrics(
            device_id=latest.device_id,
            production_line=latest.production_line,
            position=latest.position,
            current_count=current_count,
            last_update=last_update,
            speed_per_minute=speed_per_minute,
            speed_per_hour=speed_per_hour,
            total_produced_today=current_count,
            total_produced_last_hour=total_last_period,
            total_produced_last_10min=total_last_period,
            is_running=is_running,
            idle_time_seconds=idle_time,
            uptime_seconds=uptime,
            trend=trend,
            efficiency_percent=efficiency,
        )
    
    def _calculate_uptime(self, entries: List[LogEntry]) -> float:
        """
        Calculate uptime (continuous running time)
        
        Args:
            entries: List of log entries (sorted by timestamp)
            
        Returns:
            Uptime in seconds
        """
        if len(entries) < 2:
            return 0.0
        
        uptime = 0.0
        for i in range(len(entries) - 1, 0, -1):
            current = entries[i]
            previous = entries[i - 1]
            
            # If count didn't change and time gap > 30 seconds, consider stopped
            time_gap = (current.timestamp - previous.timestamp).total_seconds()
            count_change = current.count - previous.count
            
            if count_change == 0 and time_gap > 30:
                # Found a stop point
                break
            
            uptime += time_gap
        
        return uptime
    
    def _calculate_trend(self, entries: List[LogEntry]) -> str:
        """
        Calculate production trend
        
        Args:
            entries: List of log entries (sorted by timestamp)
            
        Returns:
            'increasing', 'stable', 'decreasing', or 'stopped'
        """
        if len(entries) < 3:
            return 'stable'
        
        # Get last 10 entries or less
        recent = entries[-10:]
        
        # Calculate speeds between consecutive entries
        speeds = []
        for i in range(1, len(recent)):
            time_diff = (recent[i].timestamp - recent[i-1].timestamp).total_seconds()
            count_diff = recent[i].count - recent[i-1].count
            
            if time_diff > 0:
                speed = count_diff / time_diff
                speeds.append(speed)
        
        if not speeds:
            return 'stopped'
        
        # Check if all speeds are near zero
        if all(s < 0.01 for s in speeds):
            return 'stopped'
        
        # Calculate linear regression slope
        x = np.arange(len(speeds))
        y = np.array(speeds)
        
        if len(x) < 2:
            return 'stable'
        
        slope, _ = np.polyfit(x, y, 1)
        
        # Classify based on slope
        if slope > 0.01:
            return 'increasing'
        elif slope < -0.01:
            return 'decreasing'
        else:
            return 'stable'
    
    def calculate_line_metrics(self, device_metrics: List[DeviceMetrics]) -> LineMetrics:
        """
        Calculate aggregated metrics for a production line
        
        Args:
            device_metrics: List of DeviceMetrics for devices on this line
            
        Returns:
            LineMetrics object
        """
        if not device_metrics:
            return None
        
        production_line = device_metrics[0].production_line
        total_devices = len(device_metrics)
        running_devices = sum(1 for m in device_metrics if m.is_running)
        stopped_devices = total_devices - running_devices
        
        total_produced = sum(m.total_produced_today for m in device_metrics)
        avg_speed = np.mean([m.speed_per_hour for m in device_metrics]) if device_metrics else 0.0
        
        return LineMetrics(
            production_line=production_line,
            total_devices=total_devices,
            running_devices=running_devices,
            stopped_devices=stopped_devices,
            total_produced_today=total_produced,
            average_speed_per_hour=avg_speed,
            devices=device_metrics,
        )
