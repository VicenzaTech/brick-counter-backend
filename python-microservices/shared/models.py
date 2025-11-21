"""
SQLAlchemy models for shared tables
"""
from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, Float
from sqlalchemy.sql import func
from shared.database import Base


class Measurement(Base):
    """
    Raw measurement data from IoT devices.
    Temporary storage before processing into domain-specific tables.
    """
    __tablename__ = "measurements"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(50), nullable=False, index=True)
    sensor_type = Column(String(50), nullable=False, index=True)  # 'brick_counter', 'moisture', 'temperature', etc.
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True, server_default=func.now())
    data = Column(JSON, nullable=False)  # JSONB storage for flexible sensor data
    metadata = Column(JSON)  # Additional metadata (device info, location, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Measurement(id={self.id}, device={self.device_id}, type={self.sensor_type}, ts={self.timestamp})>"


class ProcessingLog(Base):
    """
    Log of data processing activities for audit and debugging.
    """
    __tablename__ = "processing_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    service_name = Column(String(100), nullable=False, index=True)
    processing_type = Column(String(50), nullable=False)  # 'etl', 'analytics', 'anomaly_detection'
    device_id = Column(String(50), index=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    status = Column(String(20), nullable=False)  # 'running', 'success', 'failed'
    records_processed = Column(Integer, default=0)
    error_message = Column(Text)
    metadata = Column(JSON)  # Processing details, config used, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<ProcessingLog(id={self.id}, service={self.service_name}, status={self.status})>"


class BrickProductionStat(Base):
    """
    Domain-specific table for brick production statistics.
    Processed output from brick_production_service.
    """
    __tablename__ = "brick_production_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(50), nullable=False, index=True)
    production_line = Column(String(50), index=True)
    position = Column(String(50), index=True)
    brick_type = Column(String(50), index=True)
    
    # Time range
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    
    # Production metrics
    total_count = Column(Integer, nullable=False)
    count_increment = Column(Integer, nullable=False)  # New bricks in this period
    error_count = Column(Integer, default=0)
    error_rate = Column(Float, default=0.0)
    
    # Quality metrics
    avg_speed = Column(Float)  # bricks per hour
    peak_speed = Column(Float)
    downtime_seconds = Column(Integer, default=0)
    
    # Statistical metrics
    count_mean = Column(Float)
    count_std = Column(Float)
    count_min = Column(Integer)
    count_max = Column(Integer)
    
    # Anomaly detection
    is_anomaly = Column(Integer, default=0)  # 0: normal, 1: anomaly detected
    anomaly_score = Column(Float)
    anomaly_reason = Column(Text)
    
    # Metadata
    data_quality_score = Column(Float)  # 0-1 score
    metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<BrickProductionStat(id={self.id}, device={self.device_id}, count={self.total_count})>"


class MoistureAnalysisStat(Base):
    """
    Domain-specific table for moisture analysis.
    Processed output from moisture_analysis_service.
    """
    __tablename__ = "moisture_analysis_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(50), nullable=False, index=True)
    location = Column(String(100), index=True)
    
    # Time range
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    
    # Moisture metrics
    avg_moisture = Column(Float, nullable=False)
    min_moisture = Column(Float)
    max_moisture = Column(Float)
    moisture_std = Column(Float)
    
    # Analysis results
    is_optimal = Column(Integer, default=0)  # 0: not optimal, 1: optimal range
    moisture_trend = Column(String(20))  # 'increasing', 'decreasing', 'stable'
    alert_level = Column(String(20))  # 'normal', 'warning', 'critical'
    
    # Metadata
    sample_count = Column(Integer)
    metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<MoistureAnalysisStat(id={self.id}, device={self.device_id}, avg={self.avg_moisture})>"


class MachineMonitoringStat(Base):
    """
    Domain-specific table for machine monitoring.
    Processed output from machine_monitoring_service.
    """
    __tablename__ = "machine_monitoring_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(50), nullable=False, index=True)
    machine_type = Column(String(50), index=True)
    
    # Time range
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    
    # Performance metrics
    uptime_percentage = Column(Float)
    avg_temperature = Column(Float)
    max_temperature = Column(Float)
    avg_vibration = Column(Float)
    max_vibration = Column(Float)
    
    # Health status
    health_score = Column(Float)  # 0-100
    status = Column(String(20))  # 'healthy', 'degraded', 'critical'
    maintenance_needed = Column(Integer, default=0)  # 0: no, 1: yes
    
    # Alerts
    alert_count = Column(Integer, default=0)
    critical_alert_count = Column(Integer, default=0)
    
    # Metadata
    metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<MachineMonitoringStat(id={self.id}, device={self.device_id}, health={self.health_score})>"
