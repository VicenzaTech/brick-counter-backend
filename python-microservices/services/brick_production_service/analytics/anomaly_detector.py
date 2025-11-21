"""
Anomaly detection for production data
"""
from typing import List, Dict, Any, Optional, Tuple
import statistics

from shared.utils import get_logger
from services.brick_production_service.config import (
    ANOMALY_THRESHOLD_STD,
    ANOMALY_MIN_SAMPLES
)

logger = get_logger(__name__)


class AnomalyDetector:
    """
    Detector for anomalies in production time series data.
    Uses statistical methods and rule-based detection.
    """
    
    def __init__(self, threshold_std: float = ANOMALY_THRESHOLD_STD):
        """
        Initialize anomaly detector.
        
        Args:
            threshold_std: Number of standard deviations for anomaly threshold
        """
        self.threshold_std = threshold_std
    
    def detect_statistical_anomalies(
        self,
        time_series: List[Dict[str, Any]],
        field: str = 'count_increment'
    ) -> Tuple[List[int], float, Optional[str]]:
        """
        Detect anomalies using statistical method (Z-score).
        
        Args:
            time_series: Time series data points
            field: Field to analyze for anomalies
            
        Returns:
            Tuple[List[int], float, Optional[str]]:
                - List of anomaly indices
                - Anomaly score (0-1)
                - Reason for anomaly
        """
        if len(time_series) < ANOMALY_MIN_SAMPLES:
            return [], 0.0, None
        
        values = [p.get(field, 0) for p in time_series if p.get(field) is not None]
        
        if len(values) < ANOMALY_MIN_SAMPLES:
            return [], 0.0, None
        
        # Calculate mean and standard deviation
        mean = statistics.mean(values)
        std = statistics.stdev(values) if len(values) > 1 else 0
        
        if std == 0:
            return [], 0.0, None
        
        # Detect anomalies using Z-score
        anomaly_indices = []
        max_z_score = 0.0
        
        for i, value in enumerate(values):
            z_score = abs(value - mean) / std
            
            if z_score > self.threshold_std:
                anomaly_indices.append(i)
                max_z_score = max(max_z_score, z_score)
        
        # Calculate anomaly score (0-1)
        anomaly_score = min(max_z_score / (self.threshold_std * 2), 1.0)
        
        # Generate reason
        reason = None
        if anomaly_indices:
            reason = f"Statistical anomaly detected: {len(anomaly_indices)} points exceed {self.threshold_std} std deviations"
        
        return anomaly_indices, round(anomaly_score, 3), reason
    
    def detect_sudden_changes(
        self,
        time_series: List[Dict[str, Any]],
        threshold_percentage: float = 0.5
    ) -> Tuple[List[int], Optional[str]]:
        """
        Detect sudden changes in production rate.
        
        Args:
            time_series: Time series data points
            threshold_percentage: Minimum percentage change to consider anomaly
            
        Returns:
            Tuple[List[int], Optional[str]]:
                - List of anomaly indices
                - Reason for anomaly
        """
        if len(time_series) < 2:
            return [], None
        
        anomaly_indices = []
        
        for i in range(1, len(time_series)):
            prev_count = time_series[i-1].get('count', 0)
            curr_count = time_series[i].get('count', 0)
            
            if prev_count > 0:
                change_percentage = abs(curr_count - prev_count) / prev_count
                
                if change_percentage > threshold_percentage:
                    anomaly_indices.append(i)
        
        reason = None
        if anomaly_indices:
            reason = f"Sudden change detected: {len(anomaly_indices)} points with >{threshold_percentage:.0%} change"
        
        return anomaly_indices, reason
    
    def detect_production_stoppage(
        self,
        time_series: List[Dict[str, Any]],
        min_stoppage_seconds: int = 600
    ) -> Tuple[bool, Optional[str]]:
        """
        Detect if production stopped for extended period.
        
        Args:
            time_series: Time series data points
            min_stoppage_seconds: Minimum stoppage duration to flag
            
        Returns:
            Tuple[bool, Optional[str]]:
                - True if stoppage detected
                - Reason description
        """
        if len(time_series) < 2:
            return False, None
        
        max_gap = 0
        
        for i in range(1, len(time_series)):
            prev_count = time_series[i-1].get('count', 0)
            curr_count = time_series[i].get('count', 0)
            time_delta = time_series[i].get('time_delta_seconds', 0)
            
            # No count change = production stopped
            if curr_count == prev_count and time_delta > max_gap:
                max_gap = time_delta
        
        if max_gap >= min_stoppage_seconds:
            return True, f"Production stoppage detected: {max_gap / 60:.1f} minutes"
        
        return False, None
    
    def detect_high_error_rate(
        self,
        metrics: Dict[str, Any],
        threshold: float = 0.05
    ) -> Tuple[bool, Optional[str]]:
        """
        Detect abnormally high error rate.
        
        Args:
            metrics: Production metrics
            threshold: Maximum acceptable error rate
            
        Returns:
            Tuple[bool, Optional[str]]:
                - True if high error rate detected
                - Reason description
        """
        error_rate = metrics.get('error_rate', 0)
        
        if error_rate > threshold:
            return True, f"High error rate: {error_rate:.2%} (threshold: {threshold:.2%})"
        
        return False, None
    
    def detect_low_efficiency(
        self,
        metrics: Dict[str, Any],
        min_speed: float = 50.0
    ) -> Tuple[bool, Optional[str]]:
        """
        Detect abnormally low production efficiency.
        
        Args:
            metrics: Production metrics
            min_speed: Minimum acceptable speed (bricks/hour)
            
        Returns:
            Tuple[bool, Optional[str]]:
                - True if low efficiency detected
                - Reason description
        """
        avg_speed = metrics.get('avg_speed', 0)
        
        if avg_speed > 0 and avg_speed < min_speed:
            return True, f"Low production speed: {avg_speed:.1f} bricks/hour (minimum: {min_speed})"
        
        return False, None
    
    def comprehensive_analysis(
        self,
        time_series: List[Dict[str, Any]],
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Perform comprehensive anomaly analysis.
        
        Args:
            time_series: Time series data points
            metrics: Production metrics
            
        Returns:
            Dict: Comprehensive anomaly analysis with:
                - is_anomaly: Overall anomaly flag
                - anomaly_score: Overall score (0-1)
                - anomaly_reasons: List of reasons
                - anomaly_types: List of detected anomaly types
        """
        reasons = []
        anomaly_types = []
        scores = []
        
        # Statistical anomalies
        stat_indices, stat_score, stat_reason = self.detect_statistical_anomalies(time_series)
        if stat_reason:
            reasons.append(stat_reason)
            anomaly_types.append('statistical')
            scores.append(stat_score)
        
        # Sudden changes
        change_indices, change_reason = self.detect_sudden_changes(time_series)
        if change_reason:
            reasons.append(change_reason)
            anomaly_types.append('sudden_change')
            scores.append(0.6)
        
        # Production stoppage
        stoppage, stoppage_reason = self.detect_production_stoppage(time_series)
        if stoppage:
            reasons.append(stoppage_reason)
            anomaly_types.append('stoppage')
            scores.append(0.8)
        
        # High error rate
        high_errors, error_reason = self.detect_high_error_rate(metrics)
        if high_errors:
            reasons.append(error_reason)
            anomaly_types.append('high_error_rate')
            scores.append(0.9)
        
        # Low efficiency
        low_eff, eff_reason = self.detect_low_efficiency(metrics)
        if low_eff:
            reasons.append(eff_reason)
            anomaly_types.append('low_efficiency')
            scores.append(0.7)
        
        # Overall assessment
        is_anomaly = len(reasons) > 0
        overall_score = max(scores) if scores else 0.0
        
        return {
            'is_anomaly': 1 if is_anomaly else 0,
            'anomaly_score': overall_score,
            'anomaly_reason': '; '.join(reasons) if reasons else None,
            'anomaly_types': anomaly_types
        }
