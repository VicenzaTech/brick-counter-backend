"""
Repository for accessing raw measurement data
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from shared.models import Measurement
from shared.utils import get_logger

logger = get_logger(__name__)


class MeasurementRepository:
    """
    Repository for accessing raw measurement data from PostgreSQL.
    Handles all database queries related to the measurements table.
    """
    
    def __init__(self, session: Session):
        """
        Initialize repository with database session.
        
        Args:
            session: SQLAlchemy database session
        """
        self.session = session
    
    def load_measurements(
        self,
        device_id: str,
        start_time: datetime,
        end_time: datetime,
        sensor_type: str = 'brick_counter'
    ) -> List[Measurement]:
        """
        Load raw measurements for a device within a time range.
        
        Args:
            device_id: Device identifier (e.g., 'SAU-ME-01')
            start_time: Start of time range (inclusive)
            end_time: End of time range (inclusive)
            sensor_type: Type of sensor (default: 'brick_counter')
            
        Returns:
            List[Measurement]: List of measurement records ordered by timestamp
            
        Examples:
            >>> repo = MeasurementRepository(session)
            >>> measurements = repo.load_measurements(
            ...     device_id='SAU-ME-01',
            ...     start_time=datetime(2025, 11, 20, 0, 0),
            ...     end_time=datetime(2025, 11, 20, 23, 59)
            ... )
            >>> len(measurements)
            1440
        """
        try:
            query = self.session.query(Measurement).filter(
                and_(
                    Measurement.device_id == device_id,
                    Measurement.sensor_type == sensor_type,
                    Measurement.timestamp >= start_time,
                    Measurement.timestamp <= end_time
                )
            ).order_by(Measurement.timestamp.asc())
            
            measurements = query.all()
            
            logger.info(
                "Loaded measurements",
                device_id=device_id,
                sensor_type=sensor_type,
                count=len(measurements),
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat()
            )
            
            return measurements
        
        except Exception as e:
            logger.error(
                "Failed to load measurements",
                device_id=device_id,
                error=str(e)
            )
            raise
    
    def get_latest_measurement(
        self,
        device_id: str,
        sensor_type: str = 'brick_counter'
    ) -> Optional[Measurement]:
        """
        Get the most recent measurement for a device.
        
        Args:
            device_id: Device identifier
            sensor_type: Type of sensor (default: 'brick_counter')
            
        Returns:
            Optional[Measurement]: Latest measurement or None if no data exists
        """
        try:
            measurement = self.session.query(Measurement).filter(
                and_(
                    Measurement.device_id == device_id,
                    Measurement.sensor_type == sensor_type
                )
            ).order_by(Measurement.timestamp.desc()).first()
            
            return measurement
        
        except Exception as e:
            logger.error(
                "Failed to get latest measurement",
                device_id=device_id,
                error=str(e)
            )
            return None
    
    def get_measurement_count(
        self,
        device_id: str,
        start_time: datetime,
        end_time: datetime,
        sensor_type: str = 'brick_counter'
    ) -> int:
        """
        Count measurements for a device within a time range.
        
        Args:
            device_id: Device identifier
            start_time: Start of time range
            end_time: End of time range
            sensor_type: Type of sensor (default: 'brick_counter')
            
        Returns:
            int: Number of measurements
        """
        try:
            count = self.session.query(func.count(Measurement.id)).filter(
                and_(
                    Measurement.device_id == device_id,
                    Measurement.sensor_type == sensor_type,
                    Measurement.timestamp >= start_time,
                    Measurement.timestamp <= end_time
                )
            ).scalar()
            
            return count or 0
        
        except Exception as e:
            logger.error(
                "Failed to count measurements",
                device_id=device_id,
                error=str(e)
            )
            return 0
    
    def get_device_list(
        self,
        sensor_type: str = 'brick_counter'
    ) -> List[str]:
        """
        Get list of unique device IDs for a sensor type.
        
        Args:
            sensor_type: Type of sensor (default: 'brick_counter')
            
        Returns:
            List[str]: List of unique device IDs
        """
        try:
            devices = self.session.query(Measurement.device_id).filter(
                Measurement.sensor_type == sensor_type
            ).distinct().all()
            
            return [device[0] for device in devices]
        
        except Exception as e:
            logger.error(
                "Failed to get device list",
                error=str(e)
            )
            return []
