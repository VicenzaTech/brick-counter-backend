"""
Main entry point for Brick Production Service
Orchestrates ETL, analytics, and data persistence
"""
import sys
import argparse
from datetime import datetime, timedelta
from typing import Optional

from shared.database import get_db_session, check_db_connection
from shared.utils import get_logger, setup_logging, LogContext, log_processing_stats
from services.brick_production_service.config import SERVICE_NAME, LOG_LEVEL, LOG_FILE
from services.brick_production_service.repository import MeasurementRepository, ProductionRepository
from services.brick_production_service.service import ETLService, KPICalculator
from services.brick_production_service.analytics import TimeSeriesAnalyzer, AnomalyDetector
from services.brick_production_service.schemas import ProductionStatOutput

# Setup logging
setup_logging(SERVICE_NAME, LOG_LEVEL, LOG_FILE)
logger = get_logger(__name__)


class BrickProductionProcessor:
    """
    Main processor for brick production data analysis.
    Orchestrates the complete ETL and analytics pipeline.
    """
    
    def __init__(self):
        """Initialize processor with required services"""
        self.etl_service = ETLService()
        self.kpi_calculator = KPICalculator()
        self.time_series_analyzer = TimeSeriesAnalyzer(window_size_minutes=60)
        self.anomaly_detector = AnomalyDetector()
        
        logger.info(
            "Brick Production Processor initialized",
            service_name=SERVICE_NAME
        )
    
    def process_device(
        self,
        device_id: str,
        start_time: datetime,
        end_time: datetime,
        sensor_type: str = 'brick_counter'
    ) -> Optional[ProductionStatOutput]:
        """
        Process production data for a single device.
        
        This is the main processing pipeline that:
        1. Loads raw measurements from database
        2. Validates and transforms data
        3. Calculates KPIs and metrics
        4. Performs anomaly detection
        5. Saves results to domain table
        
        Args:
            device_id: Device identifier (e.g., 'SAU-ME-01')
            start_time: Start of analysis period
            end_time: End of analysis period
            sensor_type: Type of sensor (default: 'brick_counter')
            
        Returns:
            Optional[ProductionStatOutput]: Processed statistics or None if failed
            
        Examples:
            >>> processor = BrickProductionProcessor()
            >>> result = processor.process_device(
            ...     device_id='SAU-ME-01',
            ...     start_time=datetime(2025, 11, 20, 6, 0),
            ...     end_time=datetime(2025, 11, 20, 18, 0)
            ... )
        """
        processing_start = datetime.now()
        
        with LogContext(device_id=device_id, start_time=start_time, end_time=end_time):
            logger.info("Starting device processing")
            
            try:
                with get_db_session() as session:
                    # Initialize repositories
                    measurement_repo = MeasurementRepository(session)
                    production_repo = ProductionRepository(session)
                    
                    # Step 1: Load raw measurements
                    logger.info("Loading measurements from database")
                    raw_measurements = measurement_repo.load_measurements(
                        device_id=device_id,
                        start_time=start_time,
                        end_time=end_time,
                        sensor_type=sensor_type
                    )
                    
                    if not raw_measurements:
                        logger.warning("No measurements found for device")
                        return None
                    
                    # Step 2: Extract and validate
                    logger.info("Extracting and validating measurements")
                    validated_measurements = self.etl_service.extract_measurements(raw_measurements)
                    
                    if not validated_measurements:
                        logger.error("No valid measurements after validation")
                        return None
                    
                    # Step 3: Transform to time series
                    logger.info("Transforming to time series")
                    time_series = self.etl_service.transform_to_time_series(validated_measurements)
                    
                    # Step 4: Calculate increments and speed
                    logger.info("Calculating increments")
                    enhanced_series = self.etl_service.calculate_increments(time_series)
                    
                    # Step 5: Calculate production metrics
                    logger.info("Calculating production metrics")
                    production_metrics = self.kpi_calculator.calculate_production_metrics(enhanced_series)
                    
                    # Step 6: Calculate statistical metrics
                    logger.info("Calculating statistical metrics")
                    statistical_metrics = self.kpi_calculator.calculate_statistical_metrics(enhanced_series)
                    
                    # Step 7: Perform anomaly detection
                    logger.info("Performing anomaly detection")
                    anomaly_analysis = self.anomaly_detector.comprehensive_analysis(
                        enhanced_series,
                        production_metrics
                    )
                    
                    # Step 8: Assess data quality
                    logger.info("Assessing data quality")
                    data_quality_score = self.etl_service.assess_data_quality(enhanced_series)
                    
                    # Step 9: Extract metadata
                    metadata = self.etl_service.extract_metadata(validated_measurements, enhanced_series)
                    metadata['processing_version'] = '1.0.0'
                    metadata['anomaly_types'] = anomaly_analysis.get('anomaly_types', [])
                    
                    # Step 10: Create output schema
                    production_stat = ProductionStatOutput(
                        device_id=device_id,
                        production_line=metadata.get('production_line'),
                        position=metadata.get('position'),
                        brick_type=metadata.get('brick_type'),
                        start_time=start_time,
                        end_time=end_time,
                        total_count=production_metrics['total_count'],
                        count_increment=production_metrics['count_increment'],
                        error_count=production_metrics['error_count'],
                        error_rate=production_metrics['error_rate'],
                        avg_speed=production_metrics['avg_speed'],
                        peak_speed=production_metrics['peak_speed'],
                        downtime_seconds=production_metrics['downtime_seconds'],
                        count_mean=statistical_metrics['count_mean'],
                        count_std=statistical_metrics['count_std'],
                        count_min=statistical_metrics['count_min'],
                        count_max=statistical_metrics['count_max'],
                        is_anomaly=anomaly_analysis['is_anomaly'],
                        anomaly_score=anomaly_analysis['anomaly_score'],
                        anomaly_reason=anomaly_analysis['anomaly_reason'],
                        data_quality_score=data_quality_score,
                        metadata=metadata
                    )
                    
                    # Step 11: Save to database
                    logger.info("Saving production statistics")
                    saved_stat = production_repo.save_production_stat(production_stat)
                    
                    # Log processing completion
                    processing_end = datetime.now()
                    duration = (processing_end - processing_start).total_seconds()
                    
                    production_repo.log_processing(
                        service_name=SERVICE_NAME,
                        processing_type='etl',
                        device_id=device_id,
                        start_time=processing_start,
                        end_time=processing_end,
                        status='success',
                        records_processed=len(raw_measurements),
                        metadata={
                            'stat_id': saved_stat.id,
                            'duration_seconds': duration
                        }
                    )
                    
                    log_processing_stats(
                        logger,
                        records_processed=len(raw_measurements),
                        records_failed=0,
                        duration_seconds=duration
                    )
                    
                    logger.info(
                        "Device processing completed successfully",
                        stat_id=saved_stat.id,
                        count_increment=production_stat.count_increment,
                        is_anomaly=bool(production_stat.is_anomaly)
                    )
                    
                    return production_stat
            
            except Exception as e:
                processing_end = datetime.now()
                duration = (processing_end - processing_start).total_seconds()
                
                logger.error(
                    "Device processing failed",
                    error=str(e),
                    duration_seconds=duration,
                    exc_info=True
                )
                
                # Log failure
                try:
                    with get_db_session() as session:
                        production_repo = ProductionRepository(session)
                        production_repo.log_processing(
                            service_name=SERVICE_NAME,
                            processing_type='etl',
                            device_id=device_id,
                            start_time=processing_start,
                            end_time=processing_end,
                            status='failed',
                            records_processed=0,
                            error_message=str(e)
                        )
                except:
                    pass
                
                return None
    
    def process_multiple_devices(
        self,
        device_ids: list[str],
        start_time: datetime,
        end_time: datetime
    ) -> dict:
        """
        Process multiple devices in batch.
        
        Args:
            device_ids: List of device identifiers
            start_time: Start of analysis period
            end_time: End of analysis period
            
        Returns:
            dict: Summary with success/failure counts
        """
        logger.info(
            "Starting batch processing",
            device_count=len(device_ids)
        )
        
        results = {
            'success': 0,
            'failed': 0,
            'total': len(device_ids),
            'devices': {}
        }
        
        for device_id in device_ids:
            result = self.process_device(device_id, start_time, end_time)
            
            if result:
                results['success'] += 1
                results['devices'][device_id] = 'success'
            else:
                results['failed'] += 1
                results['devices'][device_id] = 'failed'
        
        logger.info(
            "Batch processing completed",
            success=results['success'],
            failed=results['failed']
        )
        
        return results


def main():
    """Main entry point for command line execution"""
    parser = argparse.ArgumentParser(description='Brick Production Data Processor')
    
    parser.add_argument(
        '--device-id',
        type=str,
        required=True,
        help='Device ID to process (e.g., SAU-ME-01)'
    )
    
    parser.add_argument(
        '--date',
        type=str,
        help='Date to process (YYYY-MM-DD, default: today)'
    )
    
    parser.add_argument(
        '--start-time',
        type=str,
        help='Start time (ISO format, e.g., 2025-11-20T06:00:00)'
    )
    
    parser.add_argument(
        '--end-time',
        type=str,
        help='End time (ISO format, e.g., 2025-11-20T18:00:00)'
    )
    
    parser.add_argument(
        '--hours',
        type=int,
        default=12,
        help='Number of hours to process (default: 12)'
    )
    
    args = parser.parse_args()
    
    # Check database connection
    if not check_db_connection():
        logger.error("Database connection failed")
        sys.exit(1)
    
    # Parse time range
    if args.start_time and args.end_time:
        start_time = datetime.fromisoformat(args.start_time)
        end_time = datetime.fromisoformat(args.end_time)
    elif args.date:
        date = datetime.strptime(args.date, '%Y-%m-%d')
        start_time = date.replace(hour=6, minute=0, second=0)
        end_time = start_time + timedelta(hours=args.hours)
    else:
        # Default: today, last 12 hours
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=args.hours)
    
    logger.info(
        "Starting brick production processor",
        device_id=args.device_id,
        start_time=start_time,
        end_time=end_time
    )
    
    # Process device
    processor = BrickProductionProcessor()
    result = processor.process_device(
        device_id=args.device_id,
        start_time=start_time,
        end_time=end_time
    )
    
    if result:
        logger.info("Processing completed successfully")
        print(f"\n✅ Success: Processed {result.count_increment} bricks")
        print(f"   Average speed: {result.avg_speed:.1f} bricks/hour")
        print(f"   Error rate: {result.error_rate:.2%}")
        print(f"   Quality score: {result.data_quality_score:.2f}")
        if result.is_anomaly:
            print(f"   ⚠️ Anomaly detected: {result.anomaly_reason}")
        sys.exit(0)
    else:
        logger.error("Processing failed")
        print("\n❌ Failed: No data processed")
        sys.exit(1)


if __name__ == '__main__':
    main()
