"""
Parse device log files
"""
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from models import LogEntry


class LogParser:
    """Parser for device log files"""
    
    LOG_PATTERN = re.compile(r'\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\] Count: (\d+)')
    
    def __init__(self, log_dir: Path):
        self.log_dir = log_dir
    
    def parse_lines(self, lines: List[str], file_path: Path) -> List[LogEntry]:
        """
        Parse lines from a log file
        
        Args:
            lines: List of log lines
            file_path: Path to source file (for metadata)
            
        Returns:
            List of LogEntry objects
        """
        entries = []
        
        try:
            # Extract metadata from path
            parts = file_path.parts
            if len(parts) < 5:
                return entries
            
            date_str = parts[-4]
            production_line = parts[-3]
            position = parts[-2]
            
            # Extract device ID from filename (handle both formats)
            # - sau-me-01_20251118T142030.txt → SAU-ME-01
            # - sau-me-01.txt → SAU-ME-01
            filename = file_path.stem
            if '_' in filename:
                device_id = filename.split('_')[0].upper()
            else:
                device_id = filename.upper()
            
            # Parse each line
            for line in lines:
                match = self.LOG_PATTERN.match(line.strip())
                if match:
                    timestamp_str, count_str = match.groups()
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    count = int(count_str)
                    
                    entries.append(LogEntry(
                        timestamp=timestamp,
                        count=count,
                        device_id=device_id,
                        production_line=production_line,
                        position=position,
                    ))
        
        except Exception as e:
            print(f"Error parsing lines from {file_path}: {e}")
        
        return entries
    
    def parse_log_file(self, file_path: Path) -> List[LogEntry]:
        """
        Parse a single log file and return list of entries
        
        Args:
            file_path: Path to log file
            
        Returns:
            List of LogEntry objects
        """
        try:
            # Read all lines
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            return self.parse_lines(lines, file_path)
        
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []
    
    def get_latest_entry(self, file_path: Path) -> Optional[LogEntry]:
        """
        Get the latest entry from a log file
        
        Args:
            file_path: Path to log file
            
        Returns:
            Latest LogEntry or None
        """
        entries = self.parse_log_file(file_path)
        return entries[-1] if entries else None
    
    def get_entries_since(self, file_path: Path, since: datetime) -> List[LogEntry]:
        """
        Get entries since a specific timestamp
        
        Args:
            file_path: Path to log file
            since: Timestamp to filter from
            
        Returns:
            List of LogEntry objects after the timestamp
        """
        entries = self.parse_log_file(file_path)
        return [e for e in entries if e.timestamp >= since]
    
    def find_device_logs(self, date: datetime) -> List[Path]:
        """
        Find all device log files for a specific date
        Returns only the latest file per device (sorted by filename timestamp)
        
        Args:
            date: Date to search for
            
        Returns:
            List of Path objects (latest file per device)
        """
        date_str = date.strftime('%Y-%m-%d')
        date_dir = self.log_dir / date_str
        
        if not date_dir.exists():
            return []
        
        # Find all .txt files recursively
        all_files = list(date_dir.rglob('*.txt'))
        
        # Group by device (files have pattern: deviceid_timestamp.txt or deviceid.txt)
        device_files: dict = {}
        
        for file_path in all_files:
            # Extract device ID from filename
            filename = file_path.stem  # Without .txt extension
            
            # Handle both formats:
            # - sau-me-01_20251118T142030.txt (with timestamp)
            # - sau-me-01.txt (old format without timestamp)
            if '_' in filename:
                device_id = filename.split('_')[0].upper()
            else:
                device_id = filename.upper()
            
            # Keep only the latest file per device (sorted by filename, newest last)
            if device_id not in device_files:
                device_files[device_id] = []
            
            device_files[device_id].append(file_path)
        
        # Get the latest file for each device
        latest_files = []
        for device_id, files in device_files.items():
            # Sort by filename (timestamp in filename) and take the last one
            latest_file = sorted(files, key=lambda f: f.name)[-1]
            latest_files.append(latest_file)
        
        return latest_files
    
    def find_device_log(self, date: datetime, production_line: str, 
                       position: str, device_id: str) -> Optional[Path]:
        """
        Find specific device log file
        
        Args:
            date: Date to search for
            production_line: Production line name (e.g., 'DC-01')
            position: Position name (e.g., 'sau-me')
            device_id: Device ID (e.g., 'SAU-ME-01')
            
        Returns:
            Path to log file or None
        """
        date_str = date.strftime('%Y-%m-%d')
        log_file = (self.log_dir / date_str / production_line / 
                   position / f"{device_id.lower()}.txt")
        
        return log_file if log_file.exists() else None
