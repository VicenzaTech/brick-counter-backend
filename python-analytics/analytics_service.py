"""
Main Analytics Service
Monitors log files and calculates realtime metrics
"""
import time
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List
import redis
from log_parser import LogParser
from metrics_calculator import MetricsCalculator
from models import DeviceMetrics, LineMetrics, LogEntry
from file_monitor import FileMonitor, TailReader
import config


class AnalyticsService:
    """Main service for realtime analytics"""
    
    def __init__(self, live_mode: bool = True):
        """
        Args:
            live_mode: If True, use file monitoring for realtime updates
        """
        self.log_parser = LogParser(config.LOG_DIR)
        self.calculator = MetricsCalculator(config.HISTORY_WINDOW)
        self.live_mode = live_mode
        
        # Redis connection for publishing metrics
        self.redis_client = redis.Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            decode_responses=True
        )
        
        # For live mode
        if self.live_mode:
            self.tail_reader = TailReader()
            self.file_monitor = FileMonitor(config.LOG_DIR, self.on_file_modified)
            # Cache to store incremental entries
            self.device_entries_cache: Dict[str, List[LogEntry]] = {}
        
        print(f"📊 Analytics Service Started")
        print(f"   Mode: {'LIVE (file monitoring)' if live_mode else 'POLLING'}")
        print(f"   Log Directory: {config.LOG_DIR}")
        print(f"   Calculation Interval: {config.CALCULATION_INTERVAL}s")
        print(f"   History Window: {config.HISTORY_WINDOW}s")
    
    def on_file_modified(self, file_path: Path):
        """
        Callback when a log file is modified (live mode only)
        
        Args:
            file_path: Path to modified file
        """
        try:
            # Get only new lines
            new_lines = self.tail_reader.get_new_lines(file_path)
            
            if not new_lines:
                return
            
            # Parse new entries
            new_entries = self.log_parser.parse_lines(new_lines, file_path)
            
            if not new_entries:
                return
            
            device_id = new_entries[0].device_id
            
            # Add to cache
            if device_id not in self.device_entries_cache:
                self.device_entries_cache[device_id] = []
            
            self.device_entries_cache[device_id].extend(new_entries)
            
            # Limit cache size (chỉ giữ 10 entries gần nhất)
            max_cache_size = 10
            if len(self.device_entries_cache[device_id]) > max_cache_size:
                self.device_entries_cache[device_id] = self.device_entries_cache[device_id][-max_cache_size:]
            
            print(f"📝 Updated {device_id}: +{len(new_entries)} entries (cache: {len(self.device_entries_cache[device_id])})")
        
        except Exception as e:
            print(f"❌ Error processing file update {file_path}: {e}")
    
    def calculate_all_metrics(self, date: datetime = None) -> Dict[str, LineMetrics]:
        """
        Calculate metrics for all devices and production lines
        
        Args:
            date: Date to calculate for (default: today)
            
        Returns:
            Dictionary mapping production line -> LineMetrics
        """
        if date is None:
            date = datetime.now()
        
        # Find all log files for today
        log_files = self.log_parser.find_device_logs(date)
        
        if not log_files:
            print(f"⚠️  No log files found for {date.strftime('%Y-%m-%d')}")
            return {}
        
        print(f"📁 Found {len(log_files)} device log files")
        
        # Group by production line
        lines: Dict[str, List[DeviceMetrics]] = {}
        
        for log_file in log_files:
            # Get entries - Always read latest from file
            # (Watchdog may not trigger on Windows Docker mounts)
            all_entries = self.log_parser.parse_log_file(log_file)
            entries = all_entries[-10:] if len(all_entries) > 10 else all_entries
            
            # Update cache for watchdog mode (if it triggers)
            if self.live_mode and entries:
                device_id = log_file.stem.upper()
                self.device_entries_cache[device_id] = entries
            
            if not entries:
                continue
            
            # Calculate device metrics
            device_metrics = self.calculator.calculate_device_metrics(entries)
            
            if device_metrics:
                production_line = device_metrics.production_line
                
                if production_line not in lines:
                    lines[production_line] = []
                
                lines[production_line].append(device_metrics)
        
        # Calculate line metrics
        line_metrics = {}
        for line_name, devices in lines.items():
            line_metrics[line_name] = self.calculator.calculate_line_metrics(devices)
        
        return line_metrics
    
    def publish_metrics(self, line_metrics: Dict[str, LineMetrics]):
        """
        Publish metrics to Redis
        
        Args:
            line_metrics: Dictionary of LineMetrics
        """
        try:
            # Publish each line's metrics
            for line_name, metrics in line_metrics.items():
                channel = f'analytics:line:{line_name}'
                data = json.dumps(metrics.to_dict())
                self.redis_client.publish(channel, data)
                
                # Also store in Redis with TTL
                key = f'metrics:line:{line_name}'
                self.redis_client.setex(key, 300, data)  # 5 min TTL
            
            # Publish aggregate metrics
            total_running = sum(m.running_devices for m in line_metrics.values())
            total_produced = sum(m.total_produced_today for m in line_metrics.values())
            
            aggregate = {
                'totalLines': len(line_metrics),
                'totalRunningDevices': total_running,
                'totalProducedToday': total_produced,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }
            
            self.redis_client.publish('analytics:aggregate', json.dumps(aggregate))
            self.redis_client.setex('metrics:aggregate', 300, json.dumps(aggregate))
            
            print(f"✅ Published metrics for {len(line_metrics)} production lines")
        
        except Exception as e:
            print(f"❌ Error publishing metrics: {e}")
    
    def run(self):
        """
        Main loop - calculate and publish metrics periodically
        """
        print(f"🚀 Starting analytics loop...")
        
        # Start file monitor if in live mode
        if self.live_mode:
            self.file_monitor.start()
        
        try:
            while True:
                try:
                    start_time = time.time()
                    
                    # Calculate metrics
                    line_metrics = self.calculate_all_metrics()
                    
                    # Publish to Redis
                    if line_metrics:
                        self.publish_metrics(line_metrics)
                        
                    # Print summary
                    for line_name, metrics in line_metrics.items():
                        print(f"\n📊 {line_name}:")
                        print(f"   Running: {metrics.running_devices}/{metrics.total_devices} devices")
                        
                        # In metrics cho từng device
                        for device in metrics.devices:
                            status_icon = "✅" if device.is_running else "⏸️"
                            print(f"   {status_icon} {device.device_id}:")
                            print(f"      Speed: {device.speed_per_minute:.2f} viên/phút ({device.speed_per_hour:.0f} viên/giờ)")
                            print(f"      Count: {device.current_count} viên")
                            print(f"      Trend: {device.trend}")
                            if device.idle_time_seconds > 0:
                                print(f"      Idle: {device.idle_time_seconds:.0f}s")                    # Calculate elapsed time
                    elapsed = time.time() - start_time
                    print(f"\n⏱️  Calculation took {elapsed:.2f}s")
                    
                    # Sleep until next interval
                    sleep_time = max(0, config.CALCULATION_INTERVAL - elapsed)
                    if sleep_time > 0:
                        time.sleep(sleep_time)
                
                except KeyboardInterrupt:
                    print("\n👋 Shutting down analytics service...")
                    break
                
                except Exception as e:
                    print(f"❌ Error in main loop: {e}")
                    time.sleep(config.CALCULATION_INTERVAL)
        
        finally:
            # Clean up
            if self.live_mode:
                self.file_monitor.stop()


def main():
    """Entry point"""
    import sys
    
    # Check command line args
    live_mode = True
    if len(sys.argv) > 1 and sys.argv[1] == '--polling':
        live_mode = False
    
    print(f"{'='*60}")
    print(f"  Analytics Service")
    print(f"  Mode: {'LIVE (file monitoring)' if live_mode else 'POLLING'}")
    print(f"{'='*60}\n")
    
    service = AnalyticsService(live_mode=live_mode)
    service.run()


if __name__ == '__main__':
    main()
