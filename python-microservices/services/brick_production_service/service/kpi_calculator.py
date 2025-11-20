"""
KPI Calculator for production metrics and key performance indicators
"""
from typing import List, Dict, Any, Optional
from datetime import timedelta
import statistics

from shared.utils import get_logger
from services.brick_production_service.config import (
    MIN_SPEED_THRESHOLD,
    MAX_ERROR_RATE
)

logger = get_logger(__name__)


class KPICalculator:
    """
    Calculator for production KPIs and performance metrics.
    Computes key indicators from processed time series data.
    """
    
    def __init__(self):
        """Initialize KPI calculator"""
        pass
    
    def calculate_production_metrics(
        self,
        time_series: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive production metrics from time series.
        
        Args:
            time_series: Enhanced time series data with increments
            
        Returns:
            Dict: Production metrics including:
                - total_count: Final cumulative count
                - count_increment: Total new production in period
                - error_count: Total errors in period
                - error_rate: Error rate as fraction
                - avg_speed: Average production speed (bricks/hour)
                - peak_speed: Maximum production speed
                - downtime_seconds: Total downtime
        """
        if not time_series:
            return self._get_empty_metrics()
        
        # Get first and last counts
        first_count = time_series[0]['count']
        last_count = time_series[-1]['count']
        total_increment = max(0, last_count - first_count)
        
        # Calculate error metrics
        first_error = time_series[0]['error_count']
        last_error = time_series[-1]['error_count']
        total_errors = max(0, last_error - first_error)
        
        error_rate = total_errors / total_increment if total_increment > 0 else 0.0
        
        # Calculate speed metrics
        speeds = [p['speed'] for p in time_series if p.get('speed', 0) > 0]
        avg_speed = statistics.mean(speeds) if speeds else 0.0
        peak_speed = max(speeds) if speeds else 0.0
        
        # Calculate downtime (gaps > threshold)
        downtime = sum(
            p.get('time_delta_seconds', 0) 
            for p in time_series 
            if p.get('time_delta_seconds', 0) > 300  # 5 minutes threshold
        )
        
        return {
            'total_count': last_count,
            'count_increment': total_increment,
            'error_count': total_errors,
            'error_rate': round(error_rate, 4),
            'avg_speed': round(avg_speed, 2),
            'peak_speed': round(peak_speed, 2),
            'downtime_seconds': int(downtime)
        }
    
    def calculate_statistical_metrics(
        self,
        time_series: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate statistical metrics for analysis.
        
        Args:
            time_series: Time series data
            
        Returns:
            Dict: Statistical metrics including mean, std, min, max
        """
        if not time_series:
            return {
                'count_mean': None,
                'count_std': None,
                'count_min': None,
                'count_max': None
            }
        
        counts = [p['count'] for p in time_series]
        
        return {
            'count_mean': round(statistics.mean(counts), 2),
            'count_std': round(statistics.stdev(counts), 2) if len(counts) > 1 else 0.0,
            'count_min': min(counts),
            'count_max': max(counts)
        }
    
    def assess_performance(
        self,
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Assess production performance against thresholds.
        
        Args:
            metrics: Calculated production metrics
            
        Returns:
            Dict: Performance assessment with:
                - is_healthy: bool
                - issues: List[str]
                - warnings: List[str]
        """
        issues = []
        warnings = []
        
        # Check error rate
        if metrics['error_rate'] > MAX_ERROR_RATE:
            issues.append(f"High error rate: {metrics['error_rate']:.2%} (threshold: {MAX_ERROR_RATE:.2%})")
        
        # Check production speed
        if metrics['avg_speed'] < MIN_SPEED_THRESHOLD:
            warnings.append(f"Low production speed: {metrics['avg_speed']:.1f} bricks/hour")
        
        # Check downtime
        if metrics['downtime_seconds'] > 3600:  # 1 hour
            warnings.append(f"Significant downtime: {metrics['downtime_seconds'] / 60:.1f} minutes")
        
        is_healthy = len(issues) == 0
        
        return {
            'is_healthy': is_healthy,
            'issues': issues,
            'warnings': warnings
        }
    
    def calculate_efficiency(
        self,
        metrics: Dict[str, Any],
        target_speed: float = 120.0  # Target: 120 bricks/hour
    ) -> float:
        """
        Calculate production efficiency as percentage of target.
        
        Args:
            metrics: Production metrics
            target_speed: Target production speed (bricks/hour)
            
        Returns:
            float: Efficiency percentage (0-100+)
        """
        actual_speed = metrics.get('avg_speed', 0)
        
        if target_speed <= 0:
            return 0.0
        
        efficiency = (actual_speed / target_speed) * 100
        
        return round(efficiency, 2)
    
    def calculate_oee(
        self,
        metrics: Dict[str, Any],
        scheduled_time_seconds: int,
        ideal_cycle_time_seconds: float = 30.0  # 30 seconds per brick
    ) -> Dict[str, float]:
        """
        Calculate Overall Equipment Effectiveness (OEE).
        
        OEE = Availability × Performance × Quality
        
        Args:
            metrics: Production metrics
            scheduled_time_seconds: Total scheduled production time
            ideal_cycle_time_seconds: Ideal time per brick
            
        Returns:
            Dict: OEE components and overall score:
                - availability: Time available for production
                - performance: Actual vs ideal production rate
                - quality: Good products vs total products
                - oee: Overall effectiveness
        """
        # Availability = (Scheduled Time - Downtime) / Scheduled Time
        actual_production_time = scheduled_time_seconds - metrics['downtime_seconds']
        availability = actual_production_time / scheduled_time_seconds if scheduled_time_seconds > 0 else 0
        
        # Performance = (Actual Output × Ideal Cycle Time) / Actual Production Time
        actual_output = metrics['count_increment']
        ideal_output_time = actual_output * ideal_cycle_time_seconds
        performance = ideal_output_time / actual_production_time if actual_production_time > 0 else 0
        performance = min(performance, 1.0)  # Cap at 100%
        
        # Quality = Good Count / Total Count
        good_count = actual_output - metrics['error_count']
        quality = good_count / actual_output if actual_output > 0 else 0
        
        # OEE = Availability × Performance × Quality
        oee = availability * performance * quality
        
        return {
            'availability': round(availability, 4),
            'performance': round(performance, 4),
            'quality': round(quality, 4),
            'oee': round(oee, 4)
        }
    
    def _get_empty_metrics(self) -> Dict[str, Any]:
        """Return empty metrics structure"""
        return {
            'total_count': 0,
            'count_increment': 0,
            'error_count': 0,
            'error_rate': 0.0,
            'avg_speed': 0.0,
            'peak_speed': 0.0,
            'downtime_seconds': 0
        }
