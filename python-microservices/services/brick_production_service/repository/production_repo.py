"""
Repository for saving processed production data
"""
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from shared.models import BrickProductionStat, ProcessingLog
from shared.utils import get_logger
from services.brick_production_service.schemas import ProductionStatOutput

logger = get_logger(__name__)


class ProductionRepository:
    """
    Repository for saving processed production statistics to PostgreSQL.
    Handles all database operations related to brick_production_stats table.
    """
    
    def __init__(self, session: Session):
        """
        Initialize repository with database session.
        
        Args:
            session: SQLAlchemy database session
        """
        self.session = session
    
    def save_production_stat(self, stat: ProductionStatOutput) -> BrickProductionStat:
        """
        Save a single production statistic record.
        
        Args:
            stat: Production statistic output schema
            
        Returns:
            BrickProductionStat: Saved database model
            
        Examples:
            >>> repo = ProductionRepository(session)
            >>> stat = ProductionStatOutput(...)
            >>> saved = repo.save_production_stat(stat)
            >>> saved.id
            123
        """
        try:
            db_stat = BrickProductionStat(
                device_id=stat.device_id,
                production_line=stat.production_line,
                position=stat.position,
                brick_type=stat.brick_type,
                start_time=stat.start_time,
                end_time=stat.end_time,
                total_count=stat.total_count,
                count_increment=stat.count_increment,
                error_count=stat.error_count,
                error_rate=stat.error_rate,
                avg_speed=stat.avg_speed,
                peak_speed=stat.peak_speed,
                downtime_seconds=stat.downtime_seconds,
                count_mean=stat.count_mean,
                count_std=stat.count_std,
                count_min=stat.count_min,
                count_max=stat.count_max,
                is_anomaly=stat.is_anomaly,
                anomaly_score=stat.anomaly_score,
                anomaly_reason=stat.anomaly_reason,
                data_quality_score=stat.data_quality_score,
                metadata=stat.metadata
            )
            
            self.session.add(db_stat)
            self.session.flush()
            
            logger.info(
                "Saved production stat",
                device_id=stat.device_id,
                stat_id=db_stat.id,
                count_increment=stat.count_increment
            )
            
            return db_stat
        
        except Exception as e:
            logger.error(
                "Failed to save production stat",
                device_id=stat.device_id,
                error=str(e)
            )
            raise
    
    def save_batch(self, stats: List[ProductionStatOutput]) -> List[BrickProductionStat]:
        """
        Save multiple production statistics in a batch.
        
        Args:
            stats: List of production statistic output schemas
            
        Returns:
            List[BrickProductionStat]: List of saved database models
        """
        try:
            saved_stats = []
            
            for stat in stats:
                db_stat = self.save_production_stat(stat)
                saved_stats.append(db_stat)
            
            logger.info(
                "Saved production stats batch",
                count=len(saved_stats)
            )
            
            return saved_stats
        
        except Exception as e:
            logger.error(
                "Failed to save stats batch",
                error=str(e)
            )
            raise
    
    def log_processing(
        self,
        service_name: str,
        processing_type: str,
        device_id: str,
        start_time,
        end_time,
        status: str,
        records_processed: int = 0,
        error_message: str = None,
        metadata: dict = None
    ) -> ProcessingLog:
        """
        Log processing activity for audit trail.
        
        Args:
            service_name: Name of the service
            processing_type: Type of processing (e.g., 'etl', 'analytics')
            device_id: Device being processed
            start_time: Processing start time
            end_time: Processing end time
            status: Processing status ('success', 'failed', 'running')
            records_processed: Number of records processed
            error_message: Error message if failed
            metadata: Additional metadata
            
        Returns:
            ProcessingLog: Saved processing log
        """
        try:
            log_entry = ProcessingLog(
                service_name=service_name,
                processing_type=processing_type,
                device_id=device_id,
                start_time=start_time,
                end_time=end_time,
                status=status,
                records_processed=records_processed,
                error_message=error_message,
                metadata=metadata
            )
            
            self.session.add(log_entry)
            self.session.flush()
            
            return log_entry
        
        except Exception as e:
            logger.error(
                "Failed to log processing",
                error=str(e)
            )
            raise
