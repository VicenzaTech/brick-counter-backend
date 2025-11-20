"""
Logging configuration and utilities
"""
import logging
import sys
from typing import Optional
import structlog
from datetime import datetime


def setup_logging(
    service_name: str,
    log_level: str = "INFO",
    log_file: Optional[str] = None
) -> None:
    """
    Setup structured logging configuration.
    
    Args:
        service_name: Name of the service for log identification
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional file path to write logs
        
    Examples:
        >>> setup_logging('brick_production_service', 'DEBUG')
    """
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, log_level.upper()),
        handlers=[
            logging.StreamHandler(sys.stdout)
        ] + ([logging.FileHandler(log_file)] if log_file else [])
    )
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper())
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """
    Get a structured logger instance.
    
    Args:
        name: Logger name (usually __name__ of the module)
        
    Returns:
        structlog.BoundLogger: Configured logger instance
        
    Examples:
        >>> logger = get_logger(__name__)
        >>> logger.info("Processing started", device_id="SAU-ME-01")
    """
    return structlog.get_logger(name)


class LogContext:
    """
    Context manager for adding context to logs.
    
    Examples:
        >>> logger = get_logger(__name__)
        >>> with LogContext(device_id="SAU-ME-01", batch_id="batch_123"):
        ...     logger.info("Processing data")
        # Output includes device_id and batch_id in all logs within context
    """
    
    def __init__(self, **kwargs):
        self.context = kwargs
    
    def __enter__(self):
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(**self.context)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        structlog.contextvars.clear_contextvars()


def log_execution_time(logger: structlog.BoundLogger, operation: str):
    """
    Decorator to log function execution time.
    
    Args:
        logger: Logger instance to use
        operation: Name of operation being timed
        
    Examples:
        >>> logger = get_logger(__name__)
        >>> @log_execution_time(logger, "data_processing")
        ... def process_data():
        ...     pass
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = datetime.now()
            logger.info(f"{operation} started")
            
            try:
                result = func(*args, **kwargs)
                duration = (datetime.now() - start_time).total_seconds()
                logger.info(
                    f"{operation} completed",
                    duration_seconds=duration
                )
                return result
            except Exception as e:
                duration = (datetime.now() - start_time).total_seconds()
                logger.error(
                    f"{operation} failed",
                    error=str(e),
                    duration_seconds=duration
                )
                raise
        
        return wrapper
    return decorator


def log_processing_stats(
    logger: structlog.BoundLogger,
    records_processed: int,
    records_failed: int,
    duration_seconds: float
) -> None:
    """
    Log processing statistics in a standardized format.
    
    Args:
        logger: Logger instance
        records_processed: Number of successfully processed records
        records_failed: Number of failed records
        duration_seconds: Total processing duration
        
    Examples:
        >>> logger = get_logger(__name__)
        >>> log_processing_stats(logger, 1000, 5, 12.5)
    """
    logger.info(
        "Processing completed",
        records_processed=records_processed,
        records_failed=records_failed,
        success_rate=f"{(records_processed / (records_processed + records_failed) * 100):.2f}%",
        duration_seconds=duration_seconds,
        throughput=f"{records_processed / duration_seconds:.2f} records/sec"
    )
