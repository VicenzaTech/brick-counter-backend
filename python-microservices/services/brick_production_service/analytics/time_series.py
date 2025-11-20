"""
Time series analysis utilities
"""
from typing import List, Dict, Any, Optional
import statistics
from datetime import datetime, timedelta

from shared.utils import get_logger

logger = get_logger(__name__)


class TimeSeriesAnalyzer:
    """
    Analyzer for time series data with rolling windows and aggregations.
    """
    
    def __init__(self, window_size_minutes: int = 60):
        """
        Initialize time series analyzer.
        
        Args:
            window_size_minutes: Size of rolling window in minutes
        """
        self.window_size_minutes = window_size_minutes
    
    def rolling_average(
        self,
        time_series: List[Dict[str, Any]],
        field: str = 'count'
    ) -> List[Dict[str, Any]]:
        """
        Calculate rolling average for a field.
        
        Args:
            time_series: Time series data points
            field: Field to calculate average for
            
        Returns:
            List[Dict]: Time series with rolling_avg field added
        """
        if not time_series:
            return []
        
        result = []
        window_seconds = self.window_size_minutes * 60
        
        for i, point in enumerate(time_series):
            current_time = point['timestamp']
            window_start = current_time - timedelta(seconds=window_seconds)
            
            # Collect values within window
            window_values = [
                p[field] for p in time_series[:i+1]
                if p['timestamp'] >= window_start and p[field] is not None
            ]
            
            if window_values:
                rolling_avg = statistics.mean(window_values)
            else:
                rolling_avg = None
            
            point_copy = point.copy()
            point_copy[f'rolling_avg_{field}'] = rolling_avg
            result.append(point_copy)
        
        return result
    
    def rolling_std(
        self,
        time_series: List[Dict[str, Any]],
        field: str = 'count'
    ) -> List[Dict[str, Any]]:
        """
        Calculate rolling standard deviation for a field.
        
        Args:
            time_series: Time series data points
            field: Field to calculate std for
            
        Returns:
            List[Dict]: Time series with rolling_std field added
        """
        if not time_series:
            return []
        
        result = []
        window_seconds = self.window_size_minutes * 60
        
        for i, point in enumerate(time_series):
            current_time = point['timestamp']
            window_start = current_time - timedelta(seconds=window_seconds)
            
            # Collect values within window
            window_values = [
                p[field] for p in time_series[:i+1]
                if p['timestamp'] >= window_start and p[field] is not None
            ]
            
            if len(window_values) > 1:
                rolling_std = statistics.stdev(window_values)
            else:
                rolling_std = None
            
            point_copy = point.copy()
            point_copy[f'rolling_std_{field}'] = rolling_std
            result.append(point_copy)
        
        return result
    
    def detect_trend(
        self,
        time_series: List[Dict[str, Any]],
        field: str = 'count'
    ) -> str:
        """
        Detect overall trend in time series.
        
        Args:
            time_series: Time series data points
            field: Field to analyze
            
        Returns:
            str: Trend direction ('increasing', 'decreasing', 'stable', 'unknown')
        """
        if len(time_series) < 3:
            return 'unknown'
        
        values = [p[field] for p in time_series if p[field] is not None]
        
        if len(values) < 3:
            return 'unknown'
        
        # Simple linear regression slope
        n = len(values)
        x = list(range(n))
        
        x_mean = statistics.mean(x)
        y_mean = statistics.mean(values)
        
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return 'stable'
        
        slope = numerator / denominator
        
        # Determine trend based on slope
        if abs(slope) < 0.1:  # Small slope threshold
            return 'stable'
        elif slope > 0:
            return 'increasing'
        else:
            return 'decreasing'
    
    def aggregate_by_interval(
        self,
        time_series: List[Dict[str, Any]],
        interval_minutes: int = 60,
        agg_func: str = 'mean'
    ) -> List[Dict[str, Any]]:
        """
        Aggregate time series data by time intervals.
        
        Args:
            time_series: Time series data points
            interval_minutes: Aggregation interval in minutes
            agg_func: Aggregation function ('mean', 'sum', 'min', 'max', 'count')
            
        Returns:
            List[Dict]: Aggregated time series
        """
        if not time_series:
            return []
        
        # Group by interval
        interval_seconds = interval_minutes * 60
        groups: Dict[datetime, List[Dict]] = {}
        
        for point in time_series:
            # Round timestamp to interval
            ts = point['timestamp']
            interval_start = datetime(
                ts.year, ts.month, ts.day, ts.hour,
                (ts.minute // interval_minutes) * interval_minutes,
                tzinfo=ts.tzinfo
            )
            
            if interval_start not in groups:
                groups[interval_start] = []
            
            groups[interval_start].append(point)
        
        # Aggregate each group
        aggregated = []
        
        for interval_start in sorted(groups.keys()):
            group_points = groups[interval_start]
            
            # Apply aggregation function
            if agg_func == 'mean':
                count = statistics.mean([p['count'] for p in group_points])
                speed = statistics.mean([p.get('speed', 0) for p in group_points])
            elif agg_func == 'sum':
                count = sum([p['count'] for p in group_points])
                speed = sum([p.get('speed', 0) for p in group_points])
            elif agg_func == 'min':
                count = min([p['count'] for p in group_points])
                speed = min([p.get('speed', 0) for p in group_points])
            elif agg_func == 'max':
                count = max([p['count'] for p in group_points])
                speed = max([p.get('speed', 0) for p in group_points])
            elif agg_func == 'count':
                count = len(group_points)
                speed = len(group_points)
            else:
                count = statistics.mean([p['count'] for p in group_points])
                speed = statistics.mean([p.get('speed', 0) for p in group_points])
            
            aggregated.append({
                'timestamp': interval_start,
                'count': count,
                'speed': speed,
                'data_points': len(group_points)
            })
        
        return aggregated
    
    def calculate_percentiles(
        self,
        time_series: List[Dict[str, Any]],
        field: str = 'count',
        percentiles: List[int] = [25, 50, 75, 95]
    ) -> Dict[int, float]:
        """
        Calculate percentiles for a field.
        
        Args:
            time_series: Time series data points
            field: Field to calculate percentiles for
            percentiles: List of percentile values (0-100)
            
        Returns:
            Dict: Percentile values {percentile: value}
        """
        values = [p[field] for p in time_series if p[field] is not None]
        
        if not values:
            return {p: None for p in percentiles}
        
        values.sort()
        n = len(values)
        
        result = {}
        for p in percentiles:
            index = int((p / 100) * n)
            index = min(index, n - 1)
            result[p] = values[index]
        
        return result
